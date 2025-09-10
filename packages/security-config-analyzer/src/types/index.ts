/**
 * Security Configuration Analyzer Types
 *
 * Comprehensive type definitions for security configuration analysis across
 * Docker containers, databases, services, and system-wide configurations.
 *
 * @author ByteBot Security Team
 * @version 1.0.0
 */

/**
 * Security severity levels for categorizing findings
 */
export enum SecuritySeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

/**
 * Configuration types supported by the security analyzer
 */
export enum ConfigurationType {
  DOCKER_CONTAINER = "docker_container",
  DOCKER_COMPOSE = "docker_compose",
  DOCKERFILE = "dockerfile",
  DATABASE_SQLITE = "database_sqlite",
  DATABASE_POSTGRESQL = "database_postgresql",
  WEB_SERVICE = "web_service",
  API_ENDPOINT = "api_endpoint",
  NETWORK_CONFIG = "network_config",
  SYSTEM_CONFIG = "system_config",
  SSL_TLS = "ssl_tls",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  ENCRYPTION = "encryption",
  FILE_PERMISSIONS = "file_permissions",
  ENVIRONMENT_VARS = "environment_vars",
}

/**
 * Security categories for classifying different types of security issues
 */
export enum SecurityCategory {
  VULNERABILITY = "vulnerability",
  MISCONFIGURATION = "misconfiguration",
  WEAK_AUTHENTICATION = "weak_authentication",
  INSECURE_COMMUNICATION = "insecure_communication",
  PRIVILEGE_ESCALATION = "privilege_escalation",
  DATA_EXPOSURE = "data_exposure",
  INJECTION = "injection",
  CRYPTOGRAPHIC_FAILURE = "cryptographic_failure",
  SECURITY_LOGGING = "security_logging",
  ACCESS_CONTROL = "access_control",
  NETWORK_CONFIG = "network_config",
}

/**
 * Core security finding interface representing a discovered security issue
 */
export interface SecurityFinding {
  /** Unique identifier for this finding */
  id: string;

  /** Human-readable title of the security issue */
  title: string;

  /** Detailed description of the security issue */
  description: string;

  /** Severity level of the finding */
  severity: SecuritySeverity;

  /** Category classification of the security issue */
  category: SecurityCategory;

  /** Type of configuration being analyzed */
  configurationType: ConfigurationType;

  /** File path or resource location where issue was found */
  location: string;

  /** Specific line number if applicable */
  lineNumber?: number;

  /** Column number if applicable */
  columnNumber?: number;

  /** Code snippet or configuration snippet showing the issue */
  codeSnippet?: string;

  /** Recommended remediation steps */
  remediation: string | StructuredRemediation;

  /** References to security standards or documentation */
  references: string[];

  /** CWE (Common Weakness Enumeration) identifier if applicable */
  cweId?: string;

  /** CVE identifier if this is a known vulnerability */
  cveId?: string;

  /** CVSS score if applicable */
  cvssScore?: number;

  /** Additional metadata about the finding */
  metadata?: Record<string, string | number | boolean | null>;

  /** Evidence data for the finding */
  evidence?: EvidenceData;

  /** Source of the finding */
  source?: string;

  /** Confidence score (0-1) */
  confidence_score?: number;

  /** False positive likelihood */
  false_positive_likelihood?:
    | "very_low"
    | "low"
    | "medium"
    | "high"
    | "very_high";

  /** CWE IDs array */
  cwe_ids?: string[];

  /** Compliance mappings */
  compliance_mappings?: Record<string, string[]>;

  /** Timestamp when finding was discovered */
  discoveredAt?: Date;

  /** Risk score calculated for prioritization */
  riskScore?: number;

  /** Whether this finding can be automatically fixed */
  autoFixable?: boolean;

  /** Auto-fix command or script if available */
  autoFixCommand?: string;
}

/**
 * Docker-specific configuration analysis interfaces
 */
export interface DockerSecurityConfig {
  /** Container configuration analysis */
  containers: DockerContainerConfig[];

  /** Compose file analysis */
  composeFiles: DockerComposeConfig[];

  /** Dockerfile analysis */
  dockerfiles: DockerfileConfig[];

  /** Image security analysis */
  images: DockerImageConfig[];

  /** Network configuration analysis */
  networks: DockerNetworkConfig[];

  /** Volume mount analysis */
  volumes: DockerVolumeConfig[];
}

/**
 * Docker volume configuration for security analysis
 */
export interface DockerVolumeConfig {
  /** Volume source path or name */
  source: string;

  /** Volume destination path */
  destination: string;

  /** Volume mount mode */
  mode?: string;

  /** Volume type */
  type?: "bind" | "volume" | "tmpfs";

  /** Read-only flag */
  readonly?: boolean;

  /** Security options */
  securityOpt?: string[];
}

export interface DockerContainerConfig {
  /** Container ID or name */
  id: string;

  /** Container image */
  image: string;

  /** Running user inside container */
  user?: string;

  /** Security options */
  securityOpt?: string[];

  /** Privileged mode */
  privileged: boolean;

  /** Capabilities added */
  capAdd?: string[];

  /** Capabilities dropped */
  capDrop?: string[];

  /** Read-only root filesystem */
  readOnlyRootfs: boolean;

  /** No new privileges */
  noNewPrivileges: boolean;

  /** Exposed ports */
  exposedPorts: string[];

  /** Environment variables */
  environment: Record<string, string>;

  /** Volume mounts */
  volumeMounts: DockerVolumeMount[];

  /** Resource limits */
  resources: DockerResourceLimits;
}

export interface DockerVolumeMount {
  /** Source path on host */
  source: string;

  /** Target path in container */
  target: string;

  /** Mount type (bind, volume, tmpfs) */
  type: string;

  /** Read-only mount */
  readOnly: boolean;

  /** Bind propagation */
  bindPropagation?: string;
}

export interface DockerResourceLimits {
  /** Memory limit */
  memory?: string;

  /** CPU limit */
  cpus?: string;

  /** PID limit */
  pidsLimit?: number;

  /** Ulimits */
  ulimits?: Array<{
    name: string;
    soft: number;
    hard: number;
  }>;
}

export interface DockerComposeConfig {
  /** Compose file path */
  filePath: string;

  /** Services defined in compose */
  services: Record<string, DockerComposeService>;

  /** Networks defined */
  networks: Record<string, DockerComposeNetwork>;

  /** Volumes defined */
  volumes: Record<string, DockerComposeVolume>;

  /** Secrets defined */
  secrets?: Record<string, DockerComposeSecret>;

  /** Configs defined */
  configs?: Record<string, Record<string, unknown>>;
}

// DockerComposeService interface moved to comprehensive definition below (line ~5455)

export interface DockerComposeBuild {
  /** Build context */
  context: string;

  /** Dockerfile path */
  dockerfile?: string;

  /** Build arguments */
  args?: Record<string, string>;

  /** Target stage */
  target?: string;
}

export interface DockerComposeNetwork {
  /** Network driver */
  driver?: string;

  /** Driver options */
  driverOpts?: Record<string, string>;

  /** External network */
  external?: boolean;

  /** Network labels */
  labels?: Record<string, string>;
}

export interface DockerComposeVolume {
  /** Volume driver */
  driver?: string;

  /** Driver options */
  driverOpts?: Record<string, string>;

  /** External volume */
  external?: boolean;

  /** Volume labels */
  labels?: Record<string, string>;
}

export interface DockerComposeSecret {
  /** Secret file path */
  file?: string;

  /** External secret */
  external?: boolean;

  /** Secret labels */
  labels?: Record<string, string>;
}

export interface DockerfileConfig {
  /** Dockerfile path */
  filePath: string;

  /** Instructions in Dockerfile */
  instructions: DockerfileInstruction[];

  /** Base image */
  baseImage: string;

  /** User instructions */
  userInstructions: DockerfileInstruction[];

  /** Exposed ports */
  exposedPorts: string[];

  /** Environment variables set */
  environmentVars: Record<string, string>;

  /** Copy/Add instructions */
  copyInstructions: DockerfileInstruction[];

  /** Run instructions */
  runInstructions: DockerfileInstruction[];
}

export interface DockerfileInstruction {
  /** Instruction type (FROM, RUN, COPY, etc.) */
  instruction: string;

  /** Instruction arguments */
  args: string;

  /** Instruction arguments as array */
  arguments: string[];

  /** Line number in Dockerfile */
  lineNumber: number;

  /** Raw line content */
  rawLine: string;

  /** Raw line content (alias for compatibility) */
  raw: string;
}

export interface DockerImageConfig {
  /** Image name and tag */
  imageId: string;

  /** Image repository */
  repository: string;

  /** Image tag */
  tag: string;

  /** Image digest */
  digest?: string;

  /** Image creation date */
  created: Date;

  /** Image size */
  size: number;

  /** Image layers */
  layers: DockerImageLayer[];

  /** Image labels */
  labels: Record<string, string>;

  /** Image configuration */
  config: DockerImageConfigDetails;

  /** Vulnerability scan results */
  vulnerabilities: ImageVulnerability[];
}

export interface DockerImageLayer {
  /** Layer digest */
  digest: string;

  /** Layer size */
  size: number;

  /** Layer command */
  command?: string;

  /** Layer creation date */
  created: Date;
}

export interface DockerImageConfigDetails {
  /** Environment variables */
  env: string[];

  /** Exposed ports */
  exposedPorts: Record<string, unknown>;

  /** User */
  user: string;

  /** Working directory */
  workingDir: string;

  /** Entrypoint */
  entrypoint: string[];

  /** Command */
  cmd: string[];

  /** Volumes */
  volumes: Record<string, unknown>;
}

export interface ImageVulnerability {
  /** Vulnerability ID */
  id: string;

  /** Package name */
  package: string;

  /** Package version */
  version: string;

  /** Vulnerability severity */
  severity: SecuritySeverity;

  /** Vulnerability description */
  description: string;

  /** Fixed version */
  fixedVersion?: string;

  /** CVE ID */
  cveId?: string;

  /** CVSS score */
  cvssScore?: number;

  /** References */
  references: string[];
}

export interface DockerNetworkConfig {
  /** Network ID */
  id: string;

  /** Network name */
  name: string;

  /** Network driver */
  driver: string;

  /** Network scope */
  scope: string;

  /** Internal network */
  internal: boolean;

  /** Attachable */
  attachable: boolean;

  /** IPv6 enabled */
  enableIPv6: boolean;

  /** IPAM configuration */
  ipam: DockerIPAMConfig;

  /** Connected containers */
  containers: string[];

  /** Network options */
  options: Record<string, string>;

  /** Network labels */
  labels: Record<string, string>;
}

export interface DockerIPAMConfig {
  /** IPAM driver */
  driver: string;

  /** IPAM configuration */
  config: Array<{
    subnet?: string;
    gateway?: string;
    auxAddresses?: Record<string, string>;
  }>;

  /** IPAM options */
  options: Record<string, string>;
}

/**
 * Database security configuration interfaces
 */
export interface DatabaseSecurityConfig {
  /** Database type */
  type: "sqlite" | "postgresql" | "mysql" | "mongodb";

  /** Connection configuration */
  connection: DatabaseConnectionConfig;

  /** Authentication configuration */
  authentication: DatabaseAuthConfig;

  /** Encryption configuration */
  encryption: DatabaseEncryptionConfig;

  /** Access control configuration */
  accessControl: DatabaseAccessControlConfig;

  /** Audit logging configuration */
  auditLogging: DatabaseAuditConfig;

  /** Backup configuration */
  backup: DatabaseBackupConfig;
}

export interface DatabaseConnectionConfig {
  /** Host */
  host: string;

  /** Port */
  port: number;

  /** Database name */
  database: string;

  /** SSL enabled */
  ssl: boolean;

  /** SSL configuration */
  sslConfig?: DatabaseSSLConfig;

  /** Connection timeout */
  connectionTimeout: number;

  /** Maximum connections */
  maxConnections: number;

  /** Connection string analysis */
  connectionString?: string;
}

export interface DatabaseSSLConfig {
  /** SSL mode */
  mode: string;

  /** Certificate file */
  cert?: string;

  /** Private key file */
  key?: string;

  /** CA certificate file */
  ca?: string;

  /** Reject unauthorized */
  rejectUnauthorized: boolean;
}

export interface DatabaseAuthConfig {
  /** Authentication method */
  method: string;

  /** Username */
  username?: string;

  /** Password authentication enabled */
  passwordAuth: boolean;

  /** Certificate authentication enabled */
  certAuth: boolean;

  /** Multi-factor authentication enabled */
  mfaEnabled: boolean;

  /** Password policy */
  passwordPolicy?: DatabasePasswordPolicy;

  /** Account lockout policy */
  lockoutPolicy?: DatabaseLockoutPolicy;
}

export interface DatabasePasswordPolicy {
  /** Minimum length */
  minLength: number;

  /** Require uppercase */
  requireUppercase: boolean;

  /** Require lowercase */
  requireLowercase: boolean;

  /** Require numbers */
  requireNumbers: boolean;

  /** Require special characters */
  requireSpecialChars: boolean;

  /** Password expiration days */
  expirationDays?: number;

  /** Password history count */
  historyCount?: number;
}

export interface DatabaseLockoutPolicy {
  /** Failed attempts threshold */
  failedAttemptsThreshold: number;

  /** Lockout duration */
  lockoutDuration: number;

  /** Reset time */
  resetTime: number;
}

export interface DatabaseEncryptionConfig {
  /** Encryption at rest enabled */
  atRest: boolean;

  /** Encryption in transit enabled */
  inTransit: boolean;

  /** Encryption algorithm */
  algorithm?: string;

  /** Key management */
  keyManagement: DatabaseKeyManagement;

  /** Field-level encryption */
  fieldLevelEncryption: boolean;

  /** Transparent data encryption */
  transparentDataEncryption: boolean;
}

export interface DatabaseKeyManagement {
  /** Key storage location */
  keyStorage: string;

  /** Key rotation enabled */
  keyRotation: boolean;

  /** Key rotation interval */
  rotationInterval?: number;

  /** Key derivation function */
  keyDerivationFunction?: string;

  /** Hardware security module */
  hsm: boolean;
}

export interface DatabaseAccessControlConfig {
  /** Role-based access control */
  rbacEnabled: boolean;

  /** Users and roles */
  users: DatabaseUser[];

  /** Roles and permissions */
  roles: DatabaseRole[];

  /** Default permissions */
  defaultPermissions: string[];

  /** Privilege escalation prevention */
  privilegeEscalationPrevention: boolean;
}

export interface DatabaseUser {
  /** Username */
  username: string;

  /** User roles */
  roles: string[];

  /** Direct permissions */
  permissions: string[];

  /** Account status */
  status: "active" | "disabled" | "locked";

  /** Last login */
  lastLogin?: Date;

  /** Password last changed */
  passwordLastChanged?: Date;
}

export interface DatabaseRole {
  /** Role name */
  name: string;

  /** Role permissions */
  permissions: string[];

  /** Inherited roles */
  inheritedRoles: string[];

  /** Role description */
  description?: string;
}

export interface DatabaseAuditConfig {
  /** Audit logging enabled */
  enabled: boolean;

  /** Log file path */
  logFile?: string;

  /** Log retention days */
  retentionDays: number;

  /** Audited events */
  auditedEvents: string[];

  /** Log rotation */
  logRotation: boolean;

  /** Log encryption */
  logEncryption: boolean;
}

export interface DatabaseBackupConfig {
  /** Backup enabled */
  enabled: boolean;

  /** Backup frequency */
  frequency: string;

  /** Backup location */
  location: string;

  /** Backup encryption */
  encryption: boolean;

  /** Backup retention */
  retention: number;

  /** Point-in-time recovery */
  pointInTimeRecovery: boolean;
}

/**
 * Service security configuration interfaces
 */
export interface ServiceSecurityConfig {
  /** Service type */
  type: "web" | "api" | "microservice" | "worker";

  /** Service endpoint configuration */
  endpoints: ServiceEndpointConfig[];

  /** Authentication configuration */
  authentication: ServiceAuthConfig;

  /** Authorization configuration */
  authorization: ServiceAuthzConfig;

  /** SSL/TLS configuration */
  tlsConfig: ServiceTLSConfig;

  /** CORS configuration */
  corsConfig: ServiceCORSConfig;

  /** Security headers configuration */
  securityHeaders: ServiceSecurityHeaders;

  /** Rate limiting configuration */
  rateLimiting: ServiceRateLimitConfig;

  /** Input validation configuration */
  inputValidation: ServiceInputValidationConfig;

  /** Session management configuration */
  sessionManagement: ServiceSessionConfig;
}

export interface ServiceEndpointConfig {
  /** Endpoint path */
  path: string;

  /** HTTP methods */
  methods: string[];

  /** Authentication required */
  authRequired: boolean;

  /** Authorization roles */
  authorizedRoles: string[];

  /** Rate limit configuration */
  rateLimit?: ServiceEndpointRateLimit;

  /** Input validation rules */
  validationRules: ServiceValidationRule[];

  /** Response headers */
  responseHeaders: Record<string, string>;

  /** HTTPS only */
  httpsOnly: boolean;
}

export interface ServiceEndpointRateLimit {
  /** Requests per minute */
  requestsPerMinute: number;

  /** Burst limit */
  burstLimit: number;

  /** Rate limit key */
  rateLimitKey: string;
}

export interface ServiceValidationRule {
  /** Field name */
  field: string;

  /** Field type */
  type: string;

  /** Required field */
  required: boolean;

  /** Validation pattern */
  pattern?: string;

  /** Minimum length */
  minLength?: number;

  /** Maximum length */
  maxLength?: number;

  /** Allowed values */
  allowedValues?: string[];

  /** Custom validation function */
  customValidator?: string;
}

export interface ServiceAuthConfig {
  /** Authentication methods */
  methods: string[];

  /** JWT configuration */
  jwtConfig?: ServiceJWTConfig;

  /** OAuth configuration */
  oauthConfig?: ServiceOAuthConfig;

  /** API key configuration */
  apiKeyConfig?: ServiceAPIKeyConfig;

  /** Session-based authentication */
  sessionAuth?: ServiceSessionAuth;

  /** Multi-factor authentication */
  mfaConfig?: ServiceMFAConfig;
}

export interface ServiceJWTConfig {
  /** JWT secret */
  secret: string;

  /** Algorithm */
  algorithm: string;

  /** Token expiration */
  expiresIn: string;

  /** Issuer */
  issuer?: string;

  /** Audience */
  audience?: string;

  /** Refresh token enabled */
  refreshTokenEnabled: boolean;

  /** Refresh token expiration */
  refreshTokenExpiresIn?: string;
}

export interface ServiceOAuthConfig {
  /** OAuth provider */
  provider: string;

  /** Client ID */
  clientId: string;

  /** Client secret */
  clientSecret: string;

  /** Redirect URI */
  redirectUri: string;

  /** Scopes */
  scopes: string[];

  /** Authorization URL */
  authorizationUrl: string;

  /** Token URL */
  tokenUrl: string;
}

export interface ServiceAPIKeyConfig {
  /** API key header name */
  headerName: string;

  /** API key validation */
  validation: string;

  /** API key storage */
  storage: string;

  /** Rate limiting per key */
  rateLimitingPerKey: boolean;
}

export interface ServiceSessionAuth {
  /** Session cookie name */
  cookieName: string;

  /** Session secret */
  secret: string;

  /** Session expiration */
  maxAge: number;

  /** Secure cookie */
  secure: boolean;

  /** HTTP only cookie */
  httpOnly: boolean;

  /** Same site policy */
  sameSite: string;

  /** Session store */
  store: string;
}

export interface ServiceMFAConfig {
  /** MFA enabled */
  enabled: boolean;

  /** MFA methods */
  methods: string[];

  /** TOTP configuration */
  totpConfig?: ServiceTOTPConfig;

  /** SMS configuration */
  smsConfig?: ServiceSMSConfig;

  /** Email configuration */
  emailConfig?: ServiceEmailMFAConfig;
}

export interface ServiceTOTPConfig {
  /** TOTP secret length */
  secretLength: number;

  /** TOTP algorithm */
  algorithm: string;

  /** TOTP period */
  period: number;

  /** TOTP digits */
  digits: number;

  /** Service name */
  serviceName: string;
}

export interface ServiceSMSConfig {
  /** SMS provider */
  provider: string;

  /** Provider configuration */
  config: Record<string, unknown>;

  /** Message template */
  messageTemplate: string;
}

export interface ServiceEmailMFAConfig {
  /** Email provider */
  provider: string;

  /** Provider configuration */
  config: Record<string, unknown>;

  /** Email template */
  emailTemplate: string;

  /** From address */
  fromAddress: string;
}

export interface ServiceAuthzConfig {
  /** Authorization model */
  model: "rbac" | "abac" | "acl";

  /** Roles and permissions */
  roles: ServiceRole[];

  /** Resources and actions */
  resources: ServiceResource[];

  /** Policy rules */
  policies: ServicePolicy[];

  /** Default deny */
  defaultDeny: boolean;
}

export interface ServiceRole {
  /** Role name */
  name: string;

  /** Role description */
  description?: string;

  /** Role permissions */
  permissions: string[];

  /** Inherited roles */
  inheritedRoles: string[];
}

export interface ServiceResource {
  /** Resource name */
  name: string;

  /** Resource type */
  type: string;

  /** Allowed actions */
  actions: string[];

  /** Resource attributes */
  attributes: Record<string, unknown>;
}

export interface ServicePolicy {
  /** Policy ID */
  id: string;

  /** Policy name */
  name: string;

  /** Policy description */
  description?: string;

  /** Policy rules */
  rules: ServicePolicyRule[];

  /** Policy effect */
  effect: "allow" | "deny";
}

export interface ServicePolicyRule {
  /** Rule subject */
  subject: string;

  /** Rule action */
  action: string;

  /** Rule resource */
  resource: string;

  /** Rule conditions */
  conditions: ServicePolicyCondition[];
}

/**
 * Policy condition value can be various types depending on the condition
 */
export type PolicyConditionValue =
  | string
  | number
  | boolean
  | string[]
  | number[]
  | { [key: string]: string | number | boolean }
  | Date;

export interface ServicePolicyCondition {
  /** Condition attribute */
  attribute: string;

  /** Condition operator */
  operator: string;

  /** Condition value - supports various types for flexible policy evaluation */
  value: PolicyConditionValue;
}

export interface ServiceTLSConfig {
  /** TLS enabled */
  enabled: boolean;

  /** TLS version */
  version: string;

  /** Certificate file */
  certFile?: string;

  /** Private key file */
  keyFile?: string;

  /** CA certificate file */
  caFile?: string;

  /** Cipher suites */
  cipherSuites: string[];

  /** HSTS enabled */
  hstsEnabled: boolean;

  /** HSTS max age */
  hstsMaxAge?: number;

  /** Certificate transparency */
  certificateTransparency: boolean;

  /** OCSP stapling */
  ocspStapling: boolean;
}

export interface ServiceCORSConfig {
  /** CORS enabled */
  enabled: boolean;

  /** Allowed origins */
  allowedOrigins: string[];

  /** Allowed methods */
  allowedMethods: string[];

  /** Allowed headers */
  allowedHeaders: string[];

  /** Exposed headers */
  exposedHeaders: string[];

  /** Allow credentials */
  allowCredentials: boolean;

  /** Max age */
  maxAge: number;
}

export interface ServiceSecurityHeaders {
  /** Content Security Policy */
  contentSecurityPolicy?: string;

  /** X-Frame-Options */
  xFrameOptions?: string;

  /** X-Content-Type-Options */
  xContentTypeOptions?: string;

  /** X-XSS-Protection */
  xXSSProtection?: string;

  /** Referrer-Policy */
  referrerPolicy?: string;

  /** Permissions-Policy */
  permissionsPolicy?: string;

  /** Strict-Transport-Security */
  strictTransportSecurity?: string;

  /** X-Permitted-Cross-Domain-Policies */
  xPermittedCrossDomainPolicies?: string;
}

export interface ServiceRateLimitConfig {
  /** Rate limiting enabled */
  enabled: boolean;

  /** Default rate limit */
  defaultLimit: ServiceRateLimit;

  /** Per-endpoint limits */
  endpointLimits: Record<string, ServiceRateLimit>;

  /** Per-user limits */
  userLimits: Record<string, ServiceRateLimit>;

  /** Rate limit store */
  store: string;

  /** Rate limit key generator */
  keyGenerator: string;

  /** Skip successful requests */
  skipSuccessfulRequests: boolean;

  /** Skip failed requests */
  skipFailedRequests: boolean;
}

export interface ServiceRateLimit {
  /** Window duration in milliseconds */
  windowMs: number;

  /** Maximum requests per window */
  max: number;

  /** Burst limit */
  burst?: number;

  /** Rate limit message */
  message?: string;

  /** Status code for rate limit exceeded */
  statusCode?: number;

  /** Headers to include */
  headers?: boolean;

  /** Skip function */
  skip?: string;
}

export interface ServiceInputValidationConfig {
  /** Validation enabled */
  enabled: boolean;

  /** Validation library */
  library: string;

  /** Sanitization enabled */
  sanitizationEnabled: boolean;

  /** Validation rules */
  rules: ServiceValidationRule[];

  /** File upload validation */
  fileUploadValidation: ServiceFileUploadValidation;

  /** SQL injection prevention */
  sqlInjectionPrevention: boolean;

  /** XSS prevention */
  xssPrevention: boolean;

  /** CSRF protection */
  csrfProtection: ServiceCSRFConfig;
}

export interface ServiceFileUploadValidation {
  /** Maximum file size */
  maxFileSize: number;

  /** Allowed file types */
  allowedFileTypes: string[];

  /** File name validation */
  fileNameValidation: string;

  /** Virus scanning */
  virusScanning: boolean;

  /** Upload directory */
  uploadDirectory: string;

  /** File permissions */
  filePermissions: string;
}

export interface ServiceCSRFConfig {
  /** CSRF protection enabled */
  enabled: boolean;

  /** CSRF token name */
  tokenName: string;

  /** CSRF cookie name */
  cookieName: string;

  /** CSRF token expiration */
  tokenExpiration: number;

  /** Same origin check */
  sameOriginCheck: boolean;

  /** Referer check */
  refererCheck: boolean;
}

export interface ServiceSessionConfig {
  /** Session management enabled */
  enabled: boolean;

  /** Session timeout */
  timeout: number;

  /** Session regeneration */
  regenerateOnLogin: boolean;

  /** Concurrent sessions */
  maxConcurrentSessions: number;

  /** Session fixation protection */
  fixationProtection: boolean;

  /** Session hijacking protection */
  hijackingProtection: ServiceSessionHijackingProtection;
}

export interface ServiceSessionHijackingProtection {
  /** IP address validation */
  ipValidation: boolean;

  /** User agent validation */
  userAgentValidation: boolean;

  /** Fingerprinting */
  fingerprinting: boolean;

  /** Token binding */
  tokenBinding: boolean;
}

/**
 * System-wide security configuration interfaces
 */
export interface SystemSecurityConfig {
  /** File system security */
  fileSystem: FileSystemSecurityConfig;

  /** Network security */
  network: NetworkSecurityConfig;

  /** Process security */
  process: ProcessSecurityConfig;

  /** Environment security */
  environment: EnvironmentSecurityConfig;

  /** System hardening */
  hardening: SystemHardeningConfig;

  /** Monitoring and logging */
  monitoring: SystemMonitoringConfig;
}

export interface FileSystemSecurityConfig {
  /** File permissions analysis */
  permissions: FilePermissionAnalysis[];

  /** Directory permissions */
  directoryPermissions: DirectoryPermissionAnalysis[];

  /** Sensitive files */
  sensitiveFiles: SensitiveFileAnalysis[];

  /** File integrity monitoring */
  integrityMonitoring: FileIntegrityConfig;

  /** Disk encryption */
  diskEncryption: DiskEncryptionConfig;
}

export interface FilePermissionAnalysis {
  /** File path */
  filePath: string;

  /** Current permissions */
  currentPermissions: string;

  /** Recommended permissions */
  recommendedPermissions: string;

  /** Owner */
  owner: string;

  /** Group */
  group: string;

  /** World readable */
  worldReadable: boolean;

  /** World writable */
  worldWritable: boolean;

  /** World executable */
  worldExecutable: boolean;

  /** SUID bit set */
  suidBit: boolean;

  /** SGID bit set */
  sgidBit: boolean;

  /** Sticky bit set */
  stickyBit: boolean;

  /** File type */
  fileType: string;

  /** Security risk level */
  riskLevel: SecuritySeverity;
}

export interface DirectoryPermissionAnalysis {
  /** Directory path */
  directoryPath: string;

  /** Current permissions */
  currentPermissions: string;

  /** Recommended permissions */
  recommendedPermissions: string;

  /** Owner */
  owner: string;

  /** Group */
  group: string;

  /** Contains sensitive files */
  containsSensitiveFiles: boolean;

  /** Public accessibility */
  publicAccessible: boolean;

  /** Security risk level */
  riskLevel: SecuritySeverity;
}

export interface SensitiveFileAnalysis {
  /** File path */
  filePath: string;

  /** File type */
  fileType:
    | "config"
    | "credential"
    | "key"
    | "certificate"
    | "database"
    | "log";

  /** Contains secrets */
  containsSecrets: boolean;

  /** Secret types found */
  secretTypes: string[];

  /** Encryption status */
  encrypted: boolean;

  /** Access permissions */
  accessPermissions: string;

  /** Last modified */
  lastModified: Date;

  /** Backup status */
  backedUp: boolean;

  /** Security recommendations */
  recommendations: string[];
}

export interface FileIntegrityConfig {
  /** Integrity monitoring enabled */
  enabled: boolean;

  /** Monitored directories */
  monitoredDirectories: string[];

  /** Excluded files */
  excludedFiles: string[];

  /** Hash algorithm */
  hashAlgorithm: string;

  /** Baseline database */
  baselineDatabase: string;

  /** Check frequency */
  checkFrequency: string;

  /** Alert on changes */
  alertOnChanges: boolean;
}

export interface DiskEncryptionConfig {
  /** Full disk encryption */
  fullDiskEncryption: boolean;

  /** Encryption algorithm */
  algorithm: string;

  /** Key management */
  keyManagement: string;

  /** Boot encryption */
  bootEncryption: boolean;

  /** Swap encryption */
  swapEncryption: boolean;

  /** Temp directory encryption */
  tempDirEncryption: boolean;
}

export interface NetworkSecurityConfig {
  /** Firewall configuration */
  firewall: FirewallConfig;

  /** Network interfaces */
  interfaces: NetworkInterfaceConfig[];

  /** Port analysis */
  openPorts: OpenPortAnalysis[];

  /** Network services */
  services: NetworkServiceConfig[];

  /** VPN configuration */
  vpn: VPNConfig;

  /** DNS configuration */
  dns: DNSSecurityConfig;
}

export interface FirewallConfig {
  /** Firewall enabled */
  enabled: boolean;

  /** Firewall type */
  type: string;

  /** Default policy */
  defaultPolicy: string;

  /** Rules */
  rules: FirewallRule[];

  /** Logging enabled */
  loggingEnabled: boolean;

  /** Log level */
  logLevel: string;
}

export interface FirewallRule {
  /** Rule number */
  ruleNumber: number;

  /** Action */
  action: "allow" | "deny" | "reject";

  /** Direction */
  direction: "in" | "out" | "both";

  /** Protocol */
  protocol: string;

  /** Source address */
  sourceAddress: string;

  /** Source port */
  sourcePort: string;

  /** Destination address */
  destinationAddress: string;

  /** Destination port */
  destinationPort: string;

  /** Rule description */
  description?: string;

  /** Rule enabled */
  enabled: boolean;
}

export interface NetworkInterfaceConfig {
  /** Interface name */
  name: string;

  /** Interface type */
  type: string;

  /** MAC address */
  macAddress: string;

  /** IP addresses */
  ipAddresses: string[];

  /** Interface status */
  status: "up" | "down";

  /** Promiscuous mode */
  promiscuousMode: boolean;

  /** Security features */
  securityFeatures: string[];
}

export interface OpenPortAnalysis {
  /** Port number */
  port: number;

  /** Protocol */
  protocol: string;

  /** Service name */
  serviceName: string;

  /** Process ID */
  processId: number;

  /** Process name */
  processName: string;

  /** Listening address */
  listeningAddress: string;

  /** Port state */
  state: string;

  /** Public accessibility */
  publicAccessible: boolean;

  /** Security risk level */
  riskLevel: SecuritySeverity;

  /** Recommendations */
  recommendations: string[];
}

export interface NetworkServiceConfig {
  /** Service name */
  name: string;

  /** Service type */
  type: string;

  /** Port */
  port: number;

  /** Protocol */
  protocol: string;

  /** Service status */
  status: "running" | "stopped" | "disabled";

  /** Configuration file */
  configFile: string;

  /** Security configuration */
  securityConfig: Record<string, unknown>;

  /** Authentication required */
  authenticationRequired: boolean;

  /** Encryption enabled */
  encryptionEnabled: boolean;
}

export interface VPNConfig {
  /** VPN enabled */
  enabled: boolean;

  /** VPN type */
  type: string;

  /** VPN server */
  server: string;

  /** VPN protocol */
  protocol: string;

  /** Encryption algorithm */
  encryptionAlgorithm: string;

  /** Authentication method */
  authenticationMethod: string;

  /** Kill switch enabled */
  killSwitchEnabled: boolean;

  /** DNS leak protection */
  dnsLeakProtection: boolean;
}

export interface DNSSecurityConfig {
  /** DNS servers */
  servers: string[];

  /** DNS over HTTPS */
  dnsOverHttps: boolean;

  /** DNS over TLS */
  dnsOverTls: boolean;

  /** DNSSEC enabled */
  dnssecEnabled: boolean;

  /** DNS filtering */
  dnsFiltering: boolean;

  /** Malware protection */
  malwareProtection: boolean;

  /** Ad blocking */
  adBlocking: boolean;
}

export interface ProcessSecurityConfig {
  /** Running processes */
  processes: ProcessAnalysis[];

  /** ASLR enabled */
  aslrEnabled: boolean;

  /** DEP/NX enabled */
  depEnabled: boolean;

  /** Stack canaries */
  stackCanaries: boolean;

  /** Process isolation */
  processIsolation: ProcessIsolationConfig;

  /** Privilege escalation monitoring */
  privilegeEscalationMonitoring: boolean;
}

export interface ProcessAnalysis {
  /** Process ID */
  pid: number;

  /** Process name */
  name: string;

  /** Process path */
  path: string;

  /** Process owner */
  owner: string;

  /** Process arguments */
  arguments: string[];

  /** Running as root */
  runningAsRoot: boolean;

  /** SUID process */
  suidProcess: boolean;

  /** Network connections */
  networkConnections: ProcessNetworkConnection[];

  /** File accesses */
  fileAccesses: string[];

  /** Memory usage */
  memoryUsage: number;

  /** CPU usage */
  cpuUsage: number;

  /** Security risk level */
  riskLevel: SecuritySeverity;
}

export interface ProcessNetworkConnection {
  /** Local address */
  localAddress: string;

  /** Local port */
  localPort: number;

  /** Remote address */
  remoteAddress: string;

  /** Remote port */
  remotePort: number;

  /** Protocol */
  protocol: string;

  /** Connection state */
  state: string;
}

export interface ProcessIsolationConfig {
  /** Containers enabled */
  containersEnabled: boolean;

  /** Namespace isolation */
  namespaceIsolation: boolean;

  /** Chroot jails */
  chrootJails: boolean;

  /** Mandatory access control */
  mandatoryAccessControl: string;

  /** Resource limits */
  resourceLimits: ProcessResourceLimits;
}

export interface ProcessResourceLimits {
  /** Memory limit */
  memoryLimit?: number;

  /** CPU limit */
  cpuLimit?: number;

  /** File descriptor limit */
  fileDescriptorLimit?: number;

  /** Process limit */
  processLimit?: number;

  /** Network bandwidth limit */
  networkBandwidthLimit?: number;
}

export interface EnvironmentSecurityConfig {
  /** Environment variables */
  variables: EnvironmentVariableAnalysis[];

  /** System configuration */
  systemConfig: SystemConfigAnalysis;

  /** Software inventory */
  softwareInventory: SoftwareInventoryAnalysis;

  /** Update management */
  updateManagement: UpdateManagementConfig;

  /** Security tools */
  securityTools: SecurityToolsConfig;
}

export interface EnvironmentVariableAnalysis {
  /** Variable name */
  name: string;

  /** Variable value */
  value: string;

  /** Contains secrets */
  containsSecrets: boolean;

  /** Secret type */
  secretType?: string;

  /** Scope */
  scope: "user" | "system" | "process";

  /** Set by */
  setBy: string;

  /** Security risk level */
  riskLevel: SecuritySeverity;

  /** Recommendations */
  recommendations: string[];
}

export interface SystemConfigAnalysis {
  /** Configuration files */
  configFiles: SystemConfigFile[];

  /** System settings */
  systemSettings: SystemSetting[];

  /** Security policies */
  securityPolicies: SystemSecurityPolicy[];

  /** Audit configuration */
  auditConfig: SystemAuditConfig;
}

export interface SystemConfigFile {
  /** File path */
  filePath: string;

  /** File type */
  fileType: string;

  /** Contains sensitive data */
  containsSensitiveData: boolean;

  /** Permissions */
  permissions: string;

  /** Owner */
  owner: string;

  /** Group */
  group: string;

  /** Last modified */
  lastModified: Date;

  /** Backup status */
  backedUp: boolean;

  /** Security issues */
  securityIssues: string[];
}

export interface SystemSetting {
  /** Setting name */
  name: string;

  /** Current value */
  currentValue: string;

  /** Recommended value */
  recommendedValue?: string;

  /** Setting category */
  category: string;

  /** Security impact */
  securityImpact: SecuritySeverity;

  /** Description */
  description: string;
}

export interface SystemSecurityPolicy {
  /** Policy name */
  name: string;

  /** Policy type */
  type: string;

  /** Policy status */
  status: "enabled" | "disabled" | "not_configured";

  /** Policy settings */
  settings: Record<string, unknown>;

  /** Compliance status */
  complianceStatus: string;

  /** Recommendations */
  recommendations: string[];
}

export interface SystemAuditConfig {
  /** Audit daemon enabled */
  auditDaemonEnabled: boolean;

  /** Audit rules */
  auditRules: SystemAuditRule[];

  /** Log retention */
  logRetention: number;

  /** Log rotation */
  logRotation: boolean;

  /** Remote logging */
  remoteLogging: boolean;

  /** Log encryption */
  logEncryption: boolean;
}

export interface SystemAuditRule {
  /** Rule ID */
  id: string;

  /** Rule description */
  description: string;

  /** Rule type */
  type: string;

  /** Rule configuration */
  configuration: string;

  /** Rule enabled */
  enabled: boolean;
}

export interface SoftwareInventoryAnalysis {
  /** Installed packages */
  packages: InstalledPackage[];

  /** Running services */
  services: InstalledService[];

  /** Kernel modules */
  kernelModules: KernelModule[];

  /** Browser extensions */
  browserExtensions: BrowserExtension[];

  /** System libraries */
  systemLibraries: SystemLibrary[];
}

export interface InstalledPackage {
  /** Package name */
  name: string;

  /** Package version */
  version: string;

  /** Package manager */
  packageManager: string;

  /** Installation date */
  installationDate: Date;

  /** Package size */
  size: number;

  /** Known vulnerabilities */
  vulnerabilities: PackageVulnerability[];

  /** Update available */
  updateAvailable: boolean;

  /** Latest version */
  latestVersion?: string;

  /** Security risk level */
  riskLevel: SecuritySeverity;
}

export interface PackageVulnerability {
  /** Vulnerability ID */
  id: string;

  /** CVE ID */
  cveId?: string;

  /** Severity */
  severity: SecuritySeverity;

  /** Description */
  description: string;

  /** Fixed version */
  fixedVersion?: string;

  /** CVSS score */
  cvssScore?: number;

  /** References */
  references: string[];
}

export interface InstalledService {
  /** Service name */
  name: string;

  /** Service status */
  status: "running" | "stopped" | "disabled";

  /** Service type */
  type: string;

  /** Start mode */
  startMode: "auto" | "manual" | "disabled";

  /** Service account */
  serviceAccount: string;

  /** Executable path */
  executablePath: string;

  /** Configuration file */
  configurationFile?: string;

  /** Port bindings */
  portBindings: number[];

  /** Security assessment */
  securityAssessment: ServiceSecurityAssessment;
}

export interface ServiceSecurityAssessment {
  /** Running as privileged user */
  runningAsPrivileged: boolean;

  /** Network exposure */
  networkExposure: boolean;

  /** Unencrypted communication */
  unencryptedCommunication: boolean;

  /** Weak authentication */
  weakAuthentication: boolean;

  /** Known vulnerabilities */
  knownVulnerabilities: string[];

  /** Security recommendations */
  recommendations: string[];

  /** Risk level */
  riskLevel: SecuritySeverity;
}

export interface KernelModule {
  /** Module name */
  name: string;

  /** Module file */
  file: string;

  /** Module size */
  size: number;

  /** Used by */
  usedBy: string[];

  /** Module description */
  description?: string;

  /** Signed module */
  signed: boolean;

  /** Security assessment */
  securityAssessment: KernelModuleSecurityAssessment;
}

export interface KernelModuleSecurityAssessment {
  /** Trusted source */
  trustedSource: boolean;

  /** Known malicious */
  knownMalicious: boolean;

  /** Unnecessary module */
  unnecessaryModule: boolean;

  /** Security recommendations */
  recommendations: string[];

  /** Risk level */
  riskLevel: SecuritySeverity;
}

export interface BrowserExtension {
  /** Extension name */
  name: string;

  /** Extension ID */
  id: string;

  /** Browser */
  browser: string;

  /** Version */
  version: string;

  /** Enabled */
  enabled: boolean;

  /** Permissions */
  permissions: string[];

  /** Source */
  source: string;

  /** Security assessment */
  securityAssessment: BrowserExtensionSecurityAssessment;
}

export interface BrowserExtensionSecurityAssessment {
  /** Excessive permissions */
  excessivePermissions: boolean;

  /** Untrusted source */
  untrustedSource: boolean;

  /** Known malicious */
  knownMalicious: boolean;

  /** Data collection */
  dataCollection: boolean;

  /** Security recommendations */
  recommendations: string[];

  /** Risk level */
  riskLevel: SecuritySeverity;
}

export interface SystemLibrary {
  /** Library name */
  name: string;

  /** Library path */
  path: string;

  /** Library version */
  version: string;

  /** Used by processes */
  usedByProcesses: string[];

  /** Known vulnerabilities */
  vulnerabilities: LibraryVulnerability[];

  /** Security assessment */
  securityAssessment: LibrarySecurityAssessment;
}

export interface LibraryVulnerability {
  /** Vulnerability ID */
  id: string;

  /** CVE ID */
  cveId?: string;

  /** Severity */
  severity: SecuritySeverity;

  /** Description */
  description: string;

  /** Fixed version */
  fixedVersion?: string;

  /** CVSS score */
  cvssScore?: number;
}

export interface LibrarySecurityAssessment {
  /** Outdated version */
  outdatedVersion: boolean;

  /** Known vulnerabilities count */
  knownVulnerabilitiesCount: number;

  /** Critical vulnerabilities */
  criticalVulnerabilities: boolean;

  /** Security recommendations */
  recommendations: string[];

  /** Risk level */
  riskLevel: SecuritySeverity;
}

export interface UpdateManagementConfig {
  /** Automatic updates enabled */
  automaticUpdatesEnabled: boolean;

  /** Update sources */
  updateSources: UpdateSource[];

  /** Update schedule */
  updateSchedule: UpdateSchedule;

  /** Security update priority */
  securityUpdatePriority: boolean;

  /** Reboot policy */
  rebootPolicy: RebootPolicy;

  /** Update notifications */
  updateNotifications: boolean;
}

export interface UpdateSource {
  /** Source name */
  name: string;

  /** Source URL */
  url: string;

  /** Source type */
  type: string;

  /** Trusted source */
  trusted: boolean;

  /** GPG verification */
  gpgVerification: boolean;

  /** HTTPS enabled */
  httpsEnabled: boolean;
}

export interface UpdateSchedule {
  /** Update frequency */
  frequency: string;

  /** Update time */
  updateTime: string;

  /** Maintenance window */
  maintenanceWindow: MaintenanceWindow;

  /** Update delay */
  updateDelay: number;
}

export interface MaintenanceWindow {
  /** Start time */
  startTime: string;

  /** End time */
  endTime: string;

  /** Days of week */
  daysOfWeek: string[];

  /** Time zone */
  timeZone: string;
}

export interface RebootPolicy {
  /** Automatic reboot */
  automaticReboot: boolean;

  /** Reboot delay */
  rebootDelay: number;

  /** Notification before reboot */
  notificationBeforeReboot: boolean;

  /** Notification time */
  notificationTime: number;
}

export interface SecurityToolsConfig {
  /** Antivirus software */
  antivirus: AntivirusConfig;

  /** Intrusion detection system */
  ids: IDSConfig;

  /** Host-based intrusion prevention */
  hips: HIPSConfig;

  /** Vulnerability scanner */
  vulnerabilityScanner: VulnerabilityScannerConfig;

  /** Log monitoring */
  logMonitoring: LogMonitoringConfig;

  /** Backup solution */
  backup: BackupSolutionConfig;
}

export interface AntivirusConfig {
  /** Antivirus installed */
  installed: boolean;

  /** Antivirus name */
  name?: string;

  /** Real-time protection */
  realTimeProtection: boolean;

  /** Scheduled scans */
  scheduledScans: boolean;

  /** Definition updates */
  definitionUpdates: boolean;

  /** Last update */
  lastUpdate?: Date;

  /** Scan results */
  lastScanResults?: AntivirusScanResults;
}

export interface AntivirusScanResults {
  /** Scan date */
  scanDate: Date;

  /** Files scanned */
  filesScanned: number;

  /** Threats found */
  threatsFound: number;

  /** Threats quarantined */
  threatsQuarantined: number;

  /** Scan duration */
  scanDuration: number;
}

export interface IDSConfig {
  /** IDS installed */
  installed: boolean;

  /** IDS name */
  name?: string;

  /** Network monitoring */
  networkMonitoring: boolean;

  /** Host monitoring */
  hostMonitoring: boolean;

  /** Real-time alerts */
  realTimeAlerts: boolean;

  /** Alert rules */
  alertRules: IDSAlertRule[];

  /** Log retention */
  logRetention: number;
}

export interface IDSAlertRule {
  /** Rule ID */
  id: string;

  /** Rule name */
  name: string;

  /** Rule description */
  description: string;

  /** Rule severity */
  severity: SecuritySeverity;

  /** Rule enabled */
  enabled: boolean;

  /** Rule pattern */
  pattern: string;
}

export interface HIPSConfig {
  /** HIPS installed */
  installed: boolean;

  /** HIPS name */
  name?: string;

  /** Application control */
  applicationControl: boolean;

  /** Firewall integration */
  firewallIntegration: boolean;

  /** Behavioral analysis */
  behavioralAnalysis: boolean;

  /** Policy rules */
  policyRules: HIPSPolicyRule[];
}

export interface HIPSPolicyRule {
  /** Rule ID */
  id: string;

  /** Rule name */
  name: string;

  /** Rule action */
  action: "allow" | "block" | "alert";

  /** Rule condition */
  condition: string;

  /** Rule enabled */
  enabled: boolean;
}

export interface VulnerabilityScannerConfig {
  /** Scanner installed */
  installed: boolean;

  /** Scanner name */
  name?: string;

  /** Scheduled scans */
  scheduledScans: boolean;

  /** Scan frequency */
  scanFrequency: string;

  /** Last scan */
  lastScan?: Date;

  /** Scan targets */
  scanTargets: string[];

  /** Vulnerability database */
  vulnerabilityDatabase: VulnerabilityDatabaseConfig;
}

export interface VulnerabilityDatabaseConfig {
  /** Database version */
  version: string;

  /** Last update */
  lastUpdate: Date;

  /** Update frequency */
  updateFrequency: string;

  /** Automatic updates */
  automaticUpdates: boolean;
}

export interface LogMonitoringConfig {
  /** Log monitoring enabled */
  enabled: boolean;

  /** Centralized logging */
  centralizedLogging: boolean;

  /** Log sources */
  logSources: LogSource[];

  /** Log retention */
  logRetention: number;

  /** Log analysis */
  logAnalysis: LogAnalysisConfig;

  /** Alerting */
  alerting: LogAlertingConfig;
}

export interface LogSource {
  /** Source name */
  name: string;

  /** Source type */
  type: string;

  /** Log file path */
  logFilePath: string;

  /** Parsing rules */
  parsingRules: string[];

  /** Enabled */
  enabled: boolean;
}

export interface LogAnalysisConfig {
  /** Real-time analysis */
  realTimeAnalysis: boolean;

  /** Pattern detection */
  patternDetection: boolean;

  /** Anomaly detection */
  anomalyDetection: boolean;

  /** Correlation rules */
  correlationRules: LogCorrelationRule[];
}

export interface LogCorrelationRule {
  /** Rule ID */
  id: string;

  /** Rule name */
  name: string;

  /** Rule pattern */
  pattern: string;

  /** Time window */
  timeWindow: number;

  /** Threshold */
  threshold: number;

  /** Severity */
  severity: SecuritySeverity;
}

export interface LogAlertingConfig {
  /** Alerting enabled */
  enabled: boolean;

  /** Alert methods */
  alertMethods: string[];

  /** Alert thresholds */
  alertThresholds: LogAlertThreshold[];

  /** Notification settings */
  notificationSettings: NotificationSettings;
}

export interface LogAlertThreshold {
  /** Log level */
  logLevel: string;

  /** Threshold count */
  thresholdCount: number;

  /** Time window */
  timeWindow: number;

  /** Alert severity */
  alertSeverity: SecuritySeverity;
}

export interface NotificationSettings {
  /** Email notifications */
  email: boolean;

  /** SMS notifications */
  sms: boolean;

  /** Webhook notifications */
  webhook: boolean;

  /** Slack notifications */
  slack: boolean;

  /** Notification recipients */
  recipients: string[];
}

export interface BackupSolutionConfig {
  /** Backup enabled */
  enabled: boolean;

  /** Backup type */
  type: string;

  /** Backup frequency */
  frequency: string;

  /** Backup targets */
  targets: string[];

  /** Backup location */
  location: string;

  /** Backup encryption */
  encryption: boolean;

  /** Backup verification */
  verification: boolean;

  /** Retention policy */
  retentionPolicy: BackupRetentionPolicy;
}

export interface BackupRetentionPolicy {
  /** Daily backups to keep */
  dailyBackups: number;

  /** Weekly backups to keep */
  weeklyBackups: number;

  /** Monthly backups to keep */
  monthlyBackups: number;

  /** Yearly backups to keep */
  yearlyBackups: number;
}

export interface SystemHardeningConfig {
  /** Operating system hardening */
  osHardening: OSHardeningConfig;

  /** Kernel hardening */
  kernelHardening: KernelHardeningConfig;

  /** Service hardening */
  serviceHardening: ServiceHardeningConfig;

  /** Application hardening */
  applicationHardening: ApplicationHardeningConfig;

  /** Compliance frameworks */
  complianceFrameworks: ComplianceFramework[];
}

export interface OSHardeningConfig {
  /** Unnecessary services disabled */
  unnecessaryServicesDisabled: boolean;

  /** Default accounts disabled */
  defaultAccountsDisabled: boolean;

  /** Password policy enforced */
  passwordPolicyEnforced: boolean;

  /** Account lockout policy */
  accountLockoutPolicy: boolean;

  /** Audit logging enabled */
  auditLoggingEnabled: boolean;

  /** File system permissions */
  fileSystemPermissions: boolean;

  /** Network security */
  networkSecurity: boolean;
}

export interface KernelHardeningConfig {
  /** Kernel parameters */
  kernelParameters: KernelParameter[];

  /** Security modules */
  securityModules: string[];

  /** Kernel protection */
  kernelProtection: KernelProtectionConfig;

  /** System call filtering */
  systemCallFiltering: boolean;

  /** Kernel module signing */
  kernelModuleSigning: boolean;
}

export interface KernelParameter {
  /** Parameter name */
  name: string;

  /** Current value */
  currentValue: string;

  /** Recommended value */
  recommendedValue: string;

  /** Description */
  description: string;

  /** Security impact */
  securityImpact: SecuritySeverity;
}

export interface KernelProtectionConfig {
  /** KASLR enabled */
  kaslrEnabled: boolean;

  /** SMEP enabled */
  smepEnabled: boolean;

  /** SMAP enabled */
  smapEnabled: boolean;

  /** Control flow integrity */
  controlFlowIntegrity: boolean;

  /** Stack protector */
  stackProtector: boolean;
}

export interface ServiceHardeningConfig {
  /** Service configurations */
  serviceConfigs: ServiceHardeningItem[];

  /** Default service state */
  defaultServiceState: string;

  /** Service account isolation */
  serviceAccountIsolation: boolean;

  /** Least privilege principle */
  leastPrivilegePrinciple: boolean;
}

export interface ServiceHardeningItem {
  /** Service name */
  serviceName: string;

  /** Hardening status */
  hardeningStatus: string;

  /** Security configuration */
  securityConfiguration: Record<string, unknown>;

  /** Recommendations */
  recommendations: string[];
}

export interface ApplicationHardeningConfig {
  /** Application security settings */
  applicationSettings: ApplicationSecuritySetting[];

  /** Code signing verification */
  codeSigningVerification: boolean;

  /** Application sandboxing */
  applicationSandboxing: boolean;

  /** Buffer overflow protection */
  bufferOverflowProtection: boolean;
}

export interface ApplicationSecuritySetting {
  /** Application name */
  applicationName: string;

  /** Security features */
  securityFeatures: string[];

  /** Configuration status */
  configurationStatus: string;

  /** Recommendations */
  recommendations: string[];
}

export interface ComplianceFramework {
  /** Framework name */
  name: string;

  /** Framework version */
  version: string;

  /** Compliance status */
  complianceStatus: string;

  /** Compliance score */
  complianceScore: number;

  /** Controls */
  controls: ComplianceControl[];
}

export interface ComplianceControl {
  /** Control ID */
  id: string;

  /** Control name */
  name: string;

  /** Control description */
  description: string;

  /** Implementation status */
  implementationStatus: string;

  /** Evidence */
  evidence: string[];

  /** Remediation */
  remediation: string[];
}

export interface SystemMonitoringConfig {
  /** Real-time monitoring */
  realTimeMonitoring: boolean;

  /** Performance monitoring */
  performanceMonitoring: PerformanceMonitoringConfig;

  /** Security monitoring */
  securityMonitoring: SecurityMonitoringConfig;

  /** Alerting system */
  alertingSystem: AlertingSystemConfig;

  /** Dashboard configuration */
  dashboardConfig: DashboardConfig;
}

export interface PerformanceMonitoringConfig {
  /** CPU monitoring */
  cpuMonitoring: boolean;

  /** Memory monitoring */
  memoryMonitoring: boolean;

  /** Disk monitoring */
  diskMonitoring: boolean;

  /** Network monitoring */
  networkMonitoring: boolean;

  /** Process monitoring */
  processMonitoring: boolean;

  /** Threshold alerts */
  thresholdAlerts: PerformanceThreshold[];
}

export interface PerformanceThreshold {
  /** Metric name */
  metricName: string;

  /** Threshold value */
  thresholdValue: number;

  /** Comparison operator */
  comparisonOperator: string;

  /** Alert severity */
  alertSeverity: SecuritySeverity;

  /** Duration */
  duration: number;
}

export interface SecurityMonitoringConfig {
  /** Failed login monitoring */
  failedLoginMonitoring: boolean;

  /** File integrity monitoring */
  fileIntegrityMonitoring: boolean;

  /** Network intrusion monitoring */
  networkIntrusionMonitoring: boolean;

  /** Process monitoring */
  processMonitoring: boolean;

  /** System call monitoring */
  systemCallMonitoring: boolean;

  /** Security events */
  securityEvents: SecurityEventConfig[];
}

export interface SecurityEventConfig {
  /** Event type */
  eventType: string;

  /** Detection rules */
  detectionRules: string[];

  /** Response actions */
  responseActions: string[];

  /** Alert severity */
  alertSeverity: SecuritySeverity;

  /** Enabled */
  enabled: boolean;
}

export interface AlertingSystemConfig {
  /** Alert channels */
  alertChannels: AlertChannel[];

  /** Alert rules */
  alertRules: AlertRule[];

  /** Escalation policies */
  escalationPolicies: EscalationPolicy[];

  /** Alert correlation */
  alertCorrelation: boolean;

  /** Alert suppression */
  alertSuppression: AlertSuppressionConfig;
}

export interface AlertChannel {
  /** Channel ID */
  id: string;

  /** Channel type */
  type: string;

  /** Channel configuration */
  configuration: Record<string, unknown>;

  /** Enabled */
  enabled: boolean;
}

export interface AlertRule {
  /** Rule ID */
  id: string;

  /** Rule name */
  name: string;

  /** Rule condition */
  condition: string;

  /** Alert severity */
  severity: SecuritySeverity;

  /** Alert channels */
  channels: string[];

  /** Enabled */
  enabled: boolean;
}

export interface EscalationPolicy {
  /** Policy ID */
  id: string;

  /** Policy name */
  name: string;

  /** Escalation levels */
  escalationLevels: EscalationLevel[];
}

export interface EscalationLevel {
  /** Level number */
  level: number;

  /** Escalation delay */
  delay: number;

  /** Notification targets */
  targets: string[];

  /** Escalation actions */
  actions: string[];
}

export interface AlertSuppressionConfig {
  /** Suppression enabled */
  enabled: boolean;

  /** Suppression rules */
  suppressionRules: AlertSuppressionRule[];

  /** Maintenance windows */
  maintenanceWindows: MaintenanceWindow[];
}

export interface AlertSuppressionRule {
  /** Rule ID */
  id: string;

  /** Rule pattern */
  pattern: string;

  /** Suppression duration */
  duration: number;

  /** Enabled */
  enabled: boolean;
}

export interface DashboardConfig {
  /** Dashboard enabled */
  enabled: boolean;

  /** Dashboard URL */
  url?: string;

  /** Widgets */
  widgets: DashboardWidget[];

  /** Refresh interval */
  refreshInterval: number;

  /** Authentication required */
  authenticationRequired: boolean;
}

export interface DashboardWidget {
  /** Widget ID */
  id: string;

  /** Widget type */
  type: string;

  /** Widget title */
  title: string;

  /** Data source */
  dataSource: string;

  /** Configuration */
  configuration: Record<string, unknown>;

  /** Position */
  position: WidgetPosition;
}

export interface WidgetPosition {
  /** X coordinate */
  x: number;

  /** Y coordinate */
  y: number;

  /** Width */
  width: number;

  /** Height */
  height: number;
}

/**
 * Analysis result interfaces
 */
export interface SecurityAnalysisResult {
  /** Analysis ID */
  analysisId: string;

  /** Analysis timestamp */
  timestamp: Date;

  /** Analysis duration */
  duration: number;

  /** Target system */
  target: AnalysisTarget;

  /** Security findings */
  findings: SecurityFinding[];

  /** Risk summary */
  riskSummary: RiskSummary;

  /** Recommendations */
  recommendations: SecurityRecommendation[];

  /** Compliance assessment */
  complianceAssessment: ComplianceAssessment;

  /** Analysis metadata */
  metadata: AnalysisMetadata;
}

export interface AnalysisTarget {
  /** Target type */
  type: "docker" | "database" | "service" | "system";

  /** Target name */
  name: string;

  /** Target path or URL */
  target?: string;

  /** Target version */
  version?: string;

  /** Target location */
  location: string;

  /** Target configuration */
  configuration: Record<string, unknown>;
}

export interface RiskFactor {
  /** Factor name */
  name: string;

  /** Factor description */
  description: string;

  /** Factor weight */
  weight: number;

  /** Factor score */
  score: number;

  /** Factor impact */
  impact: SecuritySeverity;
}

export interface SecurityRecommendation {
  /** Recommendation ID */
  id: string;

  /** Recommendation title */
  title: string;

  /** Recommendation description */
  description: string;

  /** Priority */
  priority: SecuritySeverity;

  /** Implementation effort */
  implementationEffort: "low" | "medium" | "high";

  /** Implementation steps */
  implementationSteps: string[];

  /** Expected impact */
  expectedImpact: string;

  /** Related findings */
  relatedFindings: string[];

  /** Resources */
  resources: string[];

  /** Security category */
  category?: SecurityCategory;
}

export interface FrameworkAssessment {
  /** Framework name */
  frameworkName: string;

  /** Framework version */
  frameworkVersion: string;

  /** Compliance score */
  score: number;

  /** Total controls */
  totalControls: number;

  /** Compliant controls */
  compliantControls: number;

  /** Non-compliant controls */
  nonCompliantControls: number;

  /** Control assessments */
  controlAssessments: ControlAssessment[];
}

export interface ControlAssessment {
  /** Control ID */
  controlId: string;

  /** Control name */
  controlName: string;

  /** Implementation status */
  implementationStatus:
    | "implemented"
    | "partially_implemented"
    | "not_implemented";

  /** Evidence */
  evidence: string[];

  /** Gaps */
  gaps: string[];

  /** Recommendations */
  recommendations: string[];
}

export interface ComplianceGap {
  /** Gap ID */
  id: string;

  /** Gap description */
  description: string;

  /** Framework */
  framework: string;

  /** Control */
  control: string;

  /** Impact */
  impact: SecuritySeverity;

  /** Remediation */
  remediation: string[];
}

export interface AnalysisMetadata {
  /** Analyzer version */
  analyzerVersion: string;

  /** Configuration version */
  configurationVersion: string;

  /** Analysis scope */
  analysisScope: string[];

  /** Excluded items */
  excludedItems: string[];

  /** Analysis parameters */
  analysisParameters: Record<string, unknown>;

  /** Environment information */
  environmentInfo: EnvironmentInfo;
}

export interface EnvironmentInfo {
  /** Operating system */
  operatingSystem: string;

  /** OS version */
  osVersion: string;

  /** Architecture */
  architecture: string;

  /** Hostname */
  hostname: string;

  /** System uptime */
  uptime: number;

  /** Available memory */
  availableMemory: number;

  /** Total memory */
  totalMemory: number;

  /** CPU information */
  cpuInfo: CPUInfo;

  /** Network interfaces */
  networkInterfaces: NetworkInterfaceInfo[];
}

export interface CPUInfo {
  /** CPU model */
  model: string;

  /** CPU cores */
  cores: number;

  /** CPU speed */
  speed: number;

  /** CPU architecture */
  architecture: string;
}

export interface NetworkInterfaceInfo {
  /** Interface name */
  name: string;

  /** Interface type */
  type: string;

  /** MAC address */
  macAddress: string;

  /** IP addresses */
  ipAddresses: string[];

  /** Interface status */
  status: string;
}

/**
 * Configuration and settings interfaces
 */
export interface SecurityAnalyzerConfig {
  /** General settings */
  general: GeneralConfig;

  /** Analyzer modules */
  modules: AnalyzerModuleConfig;

  /** Reporting settings */
  reporting: ReportingConfig;

  /** Integration settings */
  integrations: IntegrationConfig;

  /** Performance settings */
  performance: PerformanceConfig;

  /** Logging settings */
  logging: LoggingConfig;
}

export interface GeneralConfig {
  /** Analysis timeout */
  analysisTimeout: number;

  /** Maximum concurrent analyzers */
  maxConcurrentAnalyzers: number;

  /** Output directory */
  outputDirectory: string;

  /** Temporary directory */
  temporaryDirectory: string;

  /** Cache enabled */
  cacheEnabled: boolean;

  /** Cache directory */
  cacheDirectory: string;

  /** Cache expiration */
  cacheExpiration: number;
}

export interface AnalyzerModuleConfig {
  /** Docker analyzer settings */
  docker: DockerAnalyzerConfig;

  /** Database analyzer settings */
  database: DatabaseAnalyzerConfig;

  /** Service analyzer settings */
  service: ServiceAnalyzerConfig;

  /** System analyzer settings */
  system: SystemAnalyzerConfig;
}

export interface DockerAnalyzerConfig {
  /** Docker analyzer enabled */
  enabled: boolean;

  /** Docker socket path */
  dockerSocketPath: string;

  /** Scan containers */
  scanContainers: boolean;

  /** Scan images */
  scanImages: boolean;

  /** Scan compose files */
  scanComposeFiles: boolean;

  /** Scan dockerfiles */
  scanDockerfiles: boolean;

  /** Image vulnerability scanning */
  imageVulnerabilityScanning: boolean;

  /** Vulnerability database */
  vulnerabilityDatabase: VulnerabilityDatabaseConfig;
}

export interface DatabaseAnalyzerConfig {
  /** Database analyzer enabled */
  enabled: boolean;

  /** Supported database types */
  supportedTypes: string[];

  /** Connection timeout */
  connectionTimeout: number;

  /** Connection pool size */
  connectionPoolSize: number;

  /** SSL verification */
  sslVerification: boolean;

  /** Credential scanning */
  credentialScanning: boolean;
}

export interface ServiceAnalyzerConfig {
  /** Service analyzer enabled */
  enabled: boolean;

  /** Supported service types */
  supportedTypes: string[];

  /** Port scanning */
  portScanning: boolean;

  /** SSL/TLS testing */
  sslTlsTesting: boolean;

  /** Header analysis */
  headerAnalysis: boolean;

  /** Authentication testing */
  authenticationTesting: boolean;
}

export interface SystemAnalyzerConfig {
  /** System analyzer enabled */
  enabled: boolean;

  /** File system scanning */
  fileSystemScanning: boolean;

  /** Process analysis */
  processAnalysis: boolean;

  /** Network analysis */
  networkAnalysis: boolean;

  /** Service analysis */
  serviceAnalysis: boolean;

  /** Configuration analysis */
  configurationAnalysis: boolean;

  /** Package analysis */
  packageAnalysis: boolean;
}

export interface ReportingConfig {
  /** Report formats */
  formats: string[];

  /** Include remediation */
  includeRemediation: boolean;

  /** Include compliance */
  includeCompliance: boolean;

  /** Include executive summary */
  includeExecutiveSummary: boolean;

  /** Include technical details */
  includeTechnicalDetails: boolean;

  /** Report template */
  template: string;

  /** Custom branding */
  customBranding: boolean;
}

export interface IntegrationConfig {
  /** SIEM integration */
  siem: SIEMIntegrationConfig;

  /** Ticketing system integration */
  ticketing: TicketingIntegrationConfig;

  /** Notification integration */
  notifications: NotificationIntegrationConfig;

  /** CI/CD integration */
  cicd: CICDIntegrationConfig;
}

export interface SIEMIntegrationConfig {
  /** SIEM integration enabled */
  enabled: boolean;

  /** SIEM type */
  type: string;

  /** Connection settings */
  connection: Record<string, unknown>;

  /** Event mapping */
  eventMapping: Record<string, string>;

  /** Batch size */
  batchSize: number;

  /** Send interval */
  sendInterval: number;
}

export interface TicketingIntegrationConfig {
  /** Ticketing integration enabled */
  enabled: boolean;

  /** Ticketing system type */
  type: string;

  /** Connection settings */
  connection: Record<string, unknown>;

  /** Auto-create tickets */
  autoCreateTickets: boolean;

  /** Ticket severity mapping */
  severityMapping: Record<string, string>;

  /** Ticket template */
  ticketTemplate: string;
}

export interface NotificationIntegrationConfig {
  /** Email notifications */
  email: EmailNotificationConfig;

  /** Slack notifications */
  slack: SlackNotificationConfig;

  /** Teams notifications */
  teams: TeamsNotificationConfig;

  /** Webhook notifications */
  webhook: WebhookNotificationConfig;
}

export interface EmailNotificationConfig {
  /** Email notifications enabled */
  enabled: boolean;

  /** SMTP server */
  smtpServer: string;

  /** SMTP port */
  smtpPort: number;

  /** SMTP security */
  smtpSecurity: string;

  /** SMTP username */
  smtpUsername: string;

  /** SMTP password */
  smtpPassword: string;

  /** From address */
  fromAddress: string;

  /** Recipients */
  recipients: string[];

  /** Subject template */
  subjectTemplate: string;

  /** Body template */
  bodyTemplate: string;
}

export interface SlackNotificationConfig {
  /** Slack notifications enabled */
  enabled: boolean;

  /** Webhook URL */
  webhookUrl: string;

  /** Channel */
  channel: string;

  /** Username */
  username: string;

  /** Icon emoji */
  iconEmoji: string;

  /** Message template */
  messageTemplate: string;
}

export interface TeamsNotificationConfig {
  /** Teams notifications enabled */
  enabled: boolean;

  /** Webhook URL */
  webhookUrl: string;

  /** Message template */
  messageTemplate: string;
}

export interface WebhookNotificationConfig {
  /** Webhook notifications enabled */
  enabled: boolean;

  /** Webhook URL */
  webhookUrl: string;

  /** HTTP method */
  httpMethod: string;

  /** Headers */
  headers: Record<string, string>;

  /** Payload template */
  payloadTemplate: string;

  /** Authentication */
  authentication: WebhookAuthConfig;
}

export interface WebhookAuthConfig {
  /** Authentication type */
  type: string;

  /** Authentication configuration */
  config: Record<string, unknown>;
}

export interface CICDIntegrationConfig {
  /** CI/CD integration enabled */
  enabled: boolean;

  /** Pipeline integration */
  pipelineIntegration: boolean;

  /** Quality gates */
  qualityGates: QualityGateConfig[];

  /** Artifact publishing */
  artifactPublishing: boolean;

  /** Build breaking */
  buildBreaking: boolean;
}

export interface QualityGateConfig {
  /** Gate name */
  name: string;

  /** Gate conditions */
  conditions: QualityGateCondition[];

  /** Action on failure */
  actionOnFailure: string;
}

export interface QualityGateCondition {
  /** Metric */
  metric: string;

  /** Operator */
  operator: string;

  /** Threshold */
  threshold: number;

  /** Severity */
  severity: SecuritySeverity;
}

export interface PerformanceConfig {
  /** Worker threads */
  workerThreads: number;

  /** Memory limit */
  memoryLimit: number;

  /** CPU limit */
  cpuLimit: number;

  /** Disk space limit */
  diskSpaceLimit: number;

  /** Network bandwidth limit */
  networkBandwidthLimit: number;

  /** Concurrent scans */
  concurrentScans: number;
}

export interface LoggingConfig {
  /** Log level */
  logLevel: string;

  /** Log format */
  logFormat: string;

  /** Log file */
  logFile: string;

  /** Log rotation */
  logRotation: boolean;

  /** Log retention */
  logRetention: number;

  /** Structured logging */
  structuredLogging: boolean;

  /** Performance logging */
  performanceLogging: boolean;

  /** Debug logging */
  debugLogging: boolean;
}

/**
 * Report generation interfaces
 */
export interface SecurityReport {
  /** Report metadata */
  metadata: ReportMetadata;

  /** Executive summary */
  executiveSummary: ExecutiveSummary;

  /** Technical summary */
  technicalSummary: TechnicalSummary;

  /** Detailed findings */
  detailedFindings: DetailedFindingsSection;

  /** Risk assessment */
  riskAssessment: RiskAssessmentSection;

  /** Compliance assessment */
  complianceAssessment: ComplianceAssessmentSection;

  /** Recommendations */
  recommendations: RecommendationsSection;

  /** Appendices */
  appendices: AppendicesSection;
}

export interface ReportMetadata {
  /** Report ID */
  reportId: string;

  /** Report title */
  title: string;

  /** Report version */
  version: string;

  /** Generation date */
  generationDate: Date;

  /** Report type */
  reportType: string;

  /** Analysis period */
  analysisPeriod: AnalysisPeriod;

  /** Target systems */
  targetSystems: AnalysisTarget[];

  /** Report author */
  author: string;

  /** Report reviewer */
  reviewer?: string;

  /** Report classification */
  classification: string;
}

export interface AnalysisPeriod {
  /** Start date */
  startDate: Date;

  /** End date */
  endDate: Date;

  /** Duration */
  duration: number;
}

export interface ExecutiveSummary {
  /** Overview */
  overview: string;

  /** Key findings */
  keyFindings: string[];

  /** Risk summary */
  riskSummary: ExecutiveRiskSummary;

  /** Business impact */
  businessImpact: string;

  /** Priority recommendations */
  priorityRecommendations: string[];

  /** Compliance status */
  complianceStatus: string;
}

export interface ExecutiveRiskSummary {
  /** Overall risk level */
  overallRiskLevel: SecuritySeverity;

  /** Risk score */
  riskScore: number;

  /** Critical issues */
  criticalIssues: number;

  /** High-risk issues */
  highRiskIssues: number;

  /** Risk trends */
  riskTrends: RiskTrend[];
}

export interface RiskTrend {
  /** Date */
  date: Date;

  /** Risk score */
  riskScore: number;

  /** Finding count */
  findingCount: number;
}

export interface TechnicalSummary {
  /** Analysis scope */
  analysisScope: string;

  /** Analysis methodology */
  analysisMethodology: string;

  /** Tools used */
  toolsUsed: string[];

  /** Analysis statistics */
  analysisStatistics: AnalysisStatistics;

  /** Configuration baseline */
  configurationBaseline: string;

  /** Limitations */
  limitations: string[];
}

export interface AnalysisStatistics {
  /** Total findings */
  totalFindings: number;

  /** Findings by severity */
  findingsBySeverity: Record<SecuritySeverity, number>;

  /** Findings by category */
  findingsByCategory: Record<SecurityCategory, number>;

  /** Findings by type */
  findingsByType: Record<ConfigurationType, number>;

  /** Analysis duration */
  analysisDuration: number;

  /** Coverage metrics */
  coverageMetrics: CoverageMetrics;
}

export interface CoverageMetrics {
  /** Total targets */
  totalTargets: number;

  /** Analyzed targets */
  analyzedTargets: number;

  /** Coverage percentage */
  coveragePercentage: number;

  /** Skipped targets */
  skippedTargets: number;

  /** Error targets */
  errorTargets: number;
}

export interface DetailedFindingsSection {
  /** Findings by severity */
  findingsBySeverity: Record<SecuritySeverity, SecurityFinding[]>;

  /** Findings by category */
  findingsByCategory: Record<SecurityCategory, SecurityFinding[]>;

  /** Findings by type */
  findingsByType: Record<ConfigurationType, SecurityFinding[]>;

  /** Finding details */
  findingDetails: FindingDetail[];
}

export interface FindingDetail {
  /** Finding information */
  finding: SecurityFinding;

  /** Technical analysis */
  technicalAnalysis: string;

  /** Evidence */
  evidence: Evidence[];

  /** Impact analysis */
  impactAnalysis: ImpactAnalysis;

  /** Remediation details */
  remediationDetails: RemediationDetails;
}

/**
 * Evidence data structures for different types of security findings
 */
export type EvidenceData =
  | ConfigurationEvidence
  | FileSystemEvidence
  | NetworkEvidence
  | ProcessEvidence
  | LogEvidence
  | CertificateEvidence
  | ErrorEvidence
  | SecurityCheckEvidence
  | CryptographicEvidence
  | SystemSecurityEvidence
  | VulnerabilityEvidence
  | ComplianceEvidence
  | GenericEvidence;

export interface GenericEvidence {
  [key: string]: string | number | boolean | object | null | undefined; // Allow flexible evidence data with specific types
}

/**
 * Configuration file evidence data
 */
export interface ConfigurationEvidence {
  configType: "docker-compose" | "dockerfile" | "service-config" | "env-vars";
  filePath: string;
  configSection?: string;
  configKey?: string;
  configValue?: string | number | boolean | object;
  lineNumber?: number;
}

/**
 * File system evidence data
 */
export interface FileSystemEvidence {
  filePath: string;
  fileType: "sensitive-file" | "permission" | "ownership" | "content";
  permissions?: string;
  permissionType?: string;
  owner?: string;
  size?: number;
  fileSize?: number;
  directoryPath?: string;
  contentSnippet?: string;
}

/**
 * Network evidence data
 */
export interface NetworkEvidence {
  protocol: string;
  host?: string;
  port?: number;
  endpoint?: string;
  method?: string;
  headers?: Record<string, string>;
  responseCode?: number;
}

/**
 * Process evidence data
 */
export interface ProcessEvidence {
  processName: string;
  pid?: number;
  command?: string;
  user?: string;
  privileges?: string[];
  listening_ports?: number[];
}

/**
 * Log evidence data
 */
export interface LogEvidence {
  logFile: string;
  logLevel: "error" | "warning" | "info" | "debug";
  timestamp: Date;
  message: string;
  context?: Record<string, string | number>;
}

/**
 * Certificate evidence data
 */
export interface CertificateEvidence {
  certificateType: "ssl" | "client" | "ca";
  subject?: string;
  issuer?: string;
  validFrom?: Date;
  validTo?: Date;
  algorithm?: string;
  keySize?: number;
  fingerprint?: string;
}

/**
 * Error evidence data for analysis failures
 */
export interface ErrorEvidence {
  error: string;
  target?: string;
  timestamp?: string;
  context?: Record<string, string | number | boolean>;
}

/**
 * Security check evidence data
 */
export interface SecurityCheckEvidence {
  check: string;
  result?: boolean | string;
  details?: string;
  hostname?: string;
  port?: number;
  configFile?: string;
  firewallType?: string;
  suspiciousPattern?: string;
  fileName?: string;
  parameter?: string;
  serviceName?: string;
  username?: string;
  packageManager?: string;
  softwareName?: string;
  mode?: string;
  isExecutable?: boolean;
  permissionType?: string;
  fileSize?: number;
  directoryPath?: string;
  credentialType?: string;
  policy?: string;
  secretType?: string;
  currentValue?: string | number;
  fullServiceName?: string;
  uid?: number;
  outdatedCount?: number;
  currentVersion?: string;
  recommendedMinimum?: number;
  missingHeader?: string;
  directive?: string;
  validValues?: string[];
  expectedValue?: string | number | boolean;
  header?: string;
  credentialsType?: string;
  corsHeaders?: Record<string, string>;
  responseStatus?: number;
  sensitiveType?: string;
  cacheControl?: string;
  weakMethods?: string[];
  secretLength?: number;
  recommendedAlgorithms?: string[];
  configField?: string;
  tlsEnabled?: boolean;
  tlsVersion?: string;
  allowedOrigins?: string[];
  authRequired?: boolean;
  rateLimit?: string | number;
  vulnerableVersions?: string[];
  responseHeaders?: Record<string, string>;
  unsafeValue?: string;
  value?: string | number;
  allowOrigin?: string;
  matchedPattern?: string;
  logLevel?: string;
  frequency?: number;
  duration?: string;
  entries?: number;
  filePath?: string;
  contentType?: string;
  fileType?: "sensitive-file" | "permission" | "ownership" | "content";
  permissions?: string;
  owner?: string;
  size?: number;
  contentSnippet?: string;
}

/**
 * Cryptographic security evidence data
 */
export interface CryptographicEvidence {
  weakVersions?: string[];
  supportedVersions?: string[];
  weakCiphers?: string[];
  supportedCiphers?: string[];
  allCiphers?: string[];
  hstsHeaderPresent?: boolean;
  currentMaxAge?: number;
  recommendedMaxAge?: number;
}

/**
 * System security evidence data
 */
export interface SystemSecurityEvidence {
  configFile?: string;
  firewallType?: string;
  firewallRules?: string[];
  systemInfo?: Record<string, string | number | boolean>;
  permissions?: string;
  owner?: string;
  group?: string;
}

/**
 * Simple remediation structure used throughout analyzers
 */
export interface StructuredRemediation {
  /** Description of the remediation */
  description: string;

  /** Step-by-step remediation instructions */
  steps: string[];

  /** Priority level as string */
  priority: string;

  /** Effort level as string */
  effort: string;
}

/**
 * Vulnerability evidence data
 */
export interface VulnerabilityEvidence {
  vulnerabilityId?: string;
  severity?: string;
  affectedVersion?: string;
  fixedVersion?: string;
  cveId?: string;
  cvssScore?: number;
  packageManager?: string;
  softwareName?: string;
  installedVersion?: string;
}

/**
 * Compliance evidence data
 */
export interface ComplianceEvidence {
  standard?: string;
  requirement?: string;
  status?: "compliant" | "non-compliant" | "partial" | "unknown";
  evidence?: string;
  framework?: string;
}

export interface Evidence {
  /** Evidence type */
  type: string;

  /** Evidence description */
  description: string;

  /** Evidence data - typed structure based on evidence type */
  data: EvidenceData;

  /** Evidence source */
  source: string;

  /** Collection timestamp */
  timestamp: Date;
}

export interface ImpactAnalysis {
  /** Confidentiality impact */
  confidentialityImpact: SecuritySeverity;

  /** Integrity impact */
  integrityImpact: SecuritySeverity;

  /** Availability impact */
  availabilityImpact: SecuritySeverity;

  /** Business impact */
  businessImpact: string;

  /** Technical impact */
  technicalImpact: string;

  /** Likelihood */
  likelihood: string;
}

export interface RemediationDetails {
  /** Remediation priority */
  priority: SecuritySeverity;

  /** Implementation effort */
  implementationEffort: string;

  /** Implementation cost */
  implementationCost: string;

  /** Implementation timeline */
  implementationTimeline: string;

  /** Prerequisites */
  prerequisites: string[];

  /** Step-by-step instructions */
  instructions: string[];

  /** Validation steps */
  validationSteps: string[];

  /** Resources required */
  resourcesRequired: string[];
}

export interface RiskAssessmentSection {
  /** Risk methodology */
  riskMethodology: string;

  /** Risk matrix */
  riskMatrix: RiskMatrix;

  /** Risk factors */
  riskFactors: RiskFactor[];

  /** Risk scenarios */
  riskScenarios: RiskScenario[];

  /** Risk mitigation strategies */
  riskMitigationStrategies: RiskMitigationStrategy[];
}

export interface RiskMatrix {
  /** Likelihood levels */
  likelihoodLevels: string[];

  /** Impact levels */
  impactLevels: string[];

  /** Risk levels */
  riskLevels: string[][];

  /** Risk scoring */
  riskScoring: Record<string, number>;
}

export interface RiskScenario {
  /** Scenario ID */
  id: string;

  /** Scenario name */
  name: string;

  /** Scenario description */
  description: string;

  /** Threat actors */
  threatActors: string[];

  /** Attack vectors */
  attackVectors: string[];

  /** Vulnerabilities exploited */
  vulnerabilitiesExploited: string[];

  /** Impact description */
  impactDescription: string;

  /** Likelihood assessment */
  likelihoodAssessment: string;

  /** Risk score */
  riskScore: number;
}

export interface RiskMitigationStrategy {
  /** Strategy ID */
  id: string;

  /** Strategy name */
  name: string;

  /** Strategy description */
  description: string;

  /** Risk reduction */
  riskReduction: number;

  /** Implementation cost */
  implementationCost: string;

  /** Implementation effort */
  implementationEffort: string;

  /** Effectiveness */
  effectiveness: string;

  /** Dependencies */
  dependencies: string[];
}

export interface ComplianceAssessmentSection {
  /** Compliance frameworks */
  complianceFrameworks: FrameworkAssessment[];

  /** Gap analysis */
  gapAnalysis: ComplianceGap[];

  /** Compliance roadmap */
  complianceRoadmap: ComplianceRoadmap;

  /** Compliance metrics */
  complianceMetrics: ComplianceMetrics;
}

export interface ComplianceRoadmap {
  /** Roadmap phases */
  phases: CompliancePhase[];

  /** Timeline */
  timeline: ComplianceTimeline;

  /** Dependencies */
  dependencies: ComplianceDependency[];
}

export interface CompliancePhase {
  /** Phase number */
  phaseNumber: number;

  /** Phase name */
  phaseName: string;

  /** Phase description */
  phaseDescription: string;

  /** Deliverables */
  deliverables: string[];

  /** Duration */
  duration: number;

  /** Resources required */
  resourcesRequired: string[];
}

export interface ComplianceTimeline {
  /** Start date */
  startDate: Date;

  /** End date */
  endDate: Date;

  /** Milestones */
  milestones: ComplianceMilestone[];
}

export interface ComplianceMilestone {
  /** Milestone name */
  name: string;

  /** Milestone date */
  date: Date;

  /** Milestone description */
  description: string;

  /** Dependencies */
  dependencies: string[];
}

export interface ComplianceDependency {
  /** Dependency type */
  type: string;

  /** Dependency description */
  description: string;

  /** Impact */
  impact: string;

  /** Mitigation */
  mitigation: string;
}

export interface ComplianceMetrics {
  /** Overall compliance score */
  overallScore: number;

  /** Framework scores */
  frameworkScores: Record<string, number>;

  /** Compliance trends */
  complianceTrends: ComplianceTrend[];

  /** Control implementation status */
  controlImplementationStatus: Record<string, number>;
}

export interface ComplianceTrend {
  /** Date */
  date: Date;

  /** Compliance score */
  complianceScore: number;

  /** Framework */
  framework: string;
}

export interface RecommendationsSection {
  /** Immediate actions */
  immediateActions: SecurityRecommendation[];

  /** Short-term recommendations */
  shortTermRecommendations: SecurityRecommendation[];

  /** Long-term recommendations */
  longTermRecommendations: SecurityRecommendation[];

  /** Strategic recommendations */
  strategicRecommendations: StrategicRecommendation[];

  /** Implementation roadmap */
  implementationRoadmap: ImplementationRoadmap;
}

export interface StrategicRecommendation {
  /** Recommendation ID */
  id: string;

  /** Recommendation title */
  title: string;

  /** Recommendation description */
  description: string;

  /** Business justification */
  businessJustification: string;

  /** Expected benefits */
  expectedBenefits: string[];

  /** Investment required */
  investmentRequired: string;

  /** Timeline */
  timeline: string;

  /** Success metrics */
  successMetrics: string[];
}

export interface ImplementationRoadmap {
  /** Roadmap phases */
  phases: ImplementationPhase[];

  /** Dependencies */
  dependencies: ImplementationDependency[];

  /** Resource requirements */
  resourceRequirements: ResourceRequirement[];

  /** Success criteria */
  successCriteria: string[];
}

export interface ImplementationPhase {
  /** Phase ID */
  id: string;

  /** Phase name */
  name: string;

  /** Phase description */
  description: string;

  /** Recommendations */
  recommendations: string[];

  /** Duration */
  duration: number;

  /** Effort estimate */
  effortEstimate: string;

  /** Cost estimate */
  costEstimate: string;
}

export interface ImplementationDependency {
  /** From phase */
  fromPhase: string;

  /** To phase */
  toPhase: string;

  /** Dependency type */
  dependencyType: string;

  /** Description */
  description: string;
}

export interface ResourceRequirement {
  /** Resource type */
  resourceType: string;

  /** Resource description */
  description: string;

  /** Quantity required */
  quantityRequired: number;

  /** Duration */
  duration: number;

  /** Cost */
  cost: string;
}

export interface AppendicesSection {
  /** Technical details */
  technicalDetails: TechnicalDetailsAppendix;

  /** Raw data */
  rawData: RawDataAppendix;

  /** Tool outputs */
  toolOutputs: ToolOutputsAppendix;

  /** References */
  references: ReferencesAppendix;

  /** Glossary */
  glossary: GlossaryAppendix;
}

export interface TechnicalDetailsAppendix {
  /** Configuration files */
  configurationFiles: ConfigurationFileDetail[];

  /** System information */
  systemInformation: SystemInformationDetail;

  /** Network topology */
  networkTopology: NetworkTopologyDetail;

  /** Security controls inventory */
  securityControlsInventory: SecurityControlInventory;
}

export interface ConfigurationFileDetail {
  /** File path */
  filePath: string;

  /** File type */
  fileType: string;

  /** File content */
  fileContent: string;

  /** Security analysis */
  securityAnalysis: string;

  /** Recommendations */
  recommendations: string[];
}

export interface SystemInformationDetail {
  /** Operating system */
  operatingSystem: string;

  /** Hardware information */
  hardwareInformation: HardwareInformation;

  /** Software inventory */
  softwareInventory: SoftwareInventoryDetail;

  /** Service inventory */
  serviceInventory: ServiceInventoryDetail;
}

export interface HardwareInformation {
  /** CPU information */
  cpu: CPUInfo;

  /** Memory information */
  memory: MemoryInfo;

  /** Storage information */
  storage: StorageInfo[];

  /** Network interfaces */
  networkInterfaces: NetworkInterfaceInfo[];
}

export interface MemoryInfo {
  /** Total memory */
  totalMemory: number;

  /** Available memory */
  availableMemory: number;

  /** Memory type */
  memoryType: string;

  /** Memory speed */
  memorySpeed: number;
}

export interface StorageInfo {
  /** Device name */
  deviceName: string;

  /** Device type */
  deviceType: string;

  /** Total space */
  totalSpace: number;

  /** Available space */
  availableSpace: number;

  /** File system */
  fileSystem: string;

  /** Mount point */
  mountPoint: string;
}

export interface SoftwareInventoryDetail {
  /** Installed packages */
  packages: InstalledPackage[];

  /** Running processes */
  processes: ProcessDetail[];

  /** System services */
  services: ServiceDetail[];
}

export interface ProcessDetail {
  /** Process information */
  processInfo: ProcessAnalysis;

  /** Process tree */
  processTree: ProcessTreeNode[];

  /** Resource usage */
  resourceUsage: ProcessResourceUsage;

  /** Security analysis */
  securityAnalysis: ProcessSecurityAnalysis;
}

export interface ProcessTreeNode {
  /** Process ID */
  pid: number;

  /** Process name */
  name: string;

  /** Parent PID */
  parentPid: number;

  /** Children */
  children: ProcessTreeNode[];
}

export interface ProcessResourceUsage {
  /** CPU usage */
  cpuUsage: number;

  /** Memory usage */
  memoryUsage: number;

  /** File descriptors */
  fileDescriptors: number;

  /** Network connections */
  networkConnections: number;
}

export interface ProcessSecurityAnalysis {
  /** Security score */
  securityScore: number;

  /** Security findings */
  securityFindings: string[];

  /** Recommendations */
  recommendations: string[];
}

export interface ServiceDetail {
  /** Service information */
  serviceInfo: InstalledService;

  /** Configuration details */
  configurationDetails: ServiceConfigurationDetail;

  /** Security analysis */
  securityAnalysis: ServiceSecurityAssessment;
}

export interface ServiceConfigurationDetail {
  /** Configuration files */
  configurationFiles: string[];

  /** Configuration parameters */
  configurationParameters: Record<string, unknown>;

  /** Dependencies */
  dependencies: string[];

  /** Environment variables */
  environmentVariables: Record<string, string>;
}

export interface ServiceInventoryDetail {
  /** Network services */
  networkServices: NetworkServiceDetail[];

  /** System services */
  systemServices: SystemServiceDetail[];

  /** Application services */
  applicationServices: ApplicationServiceDetail[];
}

export interface NetworkServiceDetail {
  /** Service name */
  serviceName: string;

  /** Port information */
  portInfo: PortInfo;

  /** Protocol information */
  protocolInfo: ProtocolInfo;

  /** Security analysis */
  securityAnalysis: NetworkServiceSecurityAnalysis;
}

export interface PortInfo {
  /** Port number */
  portNumber: number;

  /** Port state */
  portState: string;

  /** Protocol */
  protocol: string;

  /** Service name */
  serviceName: string;

  /** Service version */
  serviceVersion: string;
}

export interface ProtocolInfo {
  /** Protocol name */
  protocolName: string;

  /** Protocol version */
  protocolVersion: string;

  /** Security features */
  securityFeatures: string[];

  /** Vulnerabilities */
  vulnerabilities: string[];
}

export interface NetworkServiceSecurityAnalysis {
  /** Encryption status */
  encryptionStatus: string;

  /** Authentication requirements */
  authenticationRequirements: string;

  /** Access controls */
  accessControls: string[];

  /** Known vulnerabilities */
  knownVulnerabilities: string[];

  /** Security recommendations */
  recommendations: string[];
}

export interface SystemServiceDetail {
  /** Service name */
  serviceName: string;

  /** Service type */
  serviceType: string;

  /** Service status */
  serviceStatus: string;

  /** Configuration */
  configuration: SystemServiceConfiguration;

  /** Security analysis */
  securityAnalysis: SystemServiceSecurityAnalysis;
}

export interface SystemServiceConfiguration {
  /** Start mode */
  startMode: string;

  /** Service account */
  serviceAccount: string;

  /** Dependencies */
  dependencies: string[];

  /** Resource limits */
  resourceLimits: Record<string, unknown>;
}

export interface SystemServiceSecurityAnalysis {
  /** Privilege level */
  privilegeLevel: string;

  /** Security controls */
  securityControls: string[];

  /** Vulnerabilities */
  vulnerabilities: string[];

  /** Recommendations */
  recommendations: string[];
}

export interface ApplicationServiceDetail {
  /** Application name */
  applicationName: string;

  /** Application version */
  applicationVersion: string;

  /** Application type */
  applicationType: string;

  /** Configuration */
  configuration: ApplicationServiceConfiguration;

  /** Security analysis */
  securityAnalysis: ApplicationServiceSecurityAnalysis;
}

export interface ApplicationServiceConfiguration {
  /** Configuration files */
  configurationFiles: string[];

  /** Runtime parameters */
  runtimeParameters: Record<string, unknown>;

  /** Security settings */
  securitySettings: Record<string, unknown>;

  /** Integration points */
  integrationPoints: string[];
}

export interface ApplicationServiceSecurityAnalysis {
  /** Security posture */
  securityPosture: string;

  /** Authentication mechanisms */
  authenticationMechanisms: string[];

  /** Authorization controls */
  authorizationControls: string[];

  /** Data protection */
  dataProtection: string[];

  /** Vulnerabilities */
  vulnerabilities: string[];

  /** Recommendations */
  recommendations: string[];
}

export interface NetworkTopologyDetail {
  /** Network segments */
  networkSegments: NetworkSegment[];

  /** Network devices */
  networkDevices: NetworkDevice[];

  /** Network connections */
  networkConnections: NetworkConnection[];

  /** Security zones */
  securityZones: SecurityZone[];
}

export interface NetworkSegment {
  /** Segment ID */
  segmentId: string;

  /** Segment name */
  segmentName: string;

  /** IP range */
  ipRange: string;

  /** VLAN ID */
  vlanId?: number;

  /** Security level */
  securityLevel: string;

  /** Connected devices */
  connectedDevices: string[];
}

export interface NetworkDevice {
  /** Device ID */
  deviceId: string;

  /** Device name */
  deviceName: string;

  /** Device type */
  deviceType: string;

  /** IP address */
  ipAddress: string;

  /** MAC address */
  macAddress: string;

  /** Security features */
  securityFeatures: string[];
}

export interface NetworkConnection {
  /** Source device */
  sourceDevice: string;

  /** Destination device */
  destinationDevice: string;

  /** Connection type */
  connectionType: string;

  /** Protocol */
  protocol: string;

  /** Port */
  port: number;

  /** Encryption */
  encryption: boolean;

  /** Authentication */
  authentication: boolean;
}

export interface SecurityZone {
  /** Zone ID */
  zoneId: string;

  /** Zone name */
  zoneName: string;

  /** Zone description */
  zoneDescription: string;

  /** Security level */
  securityLevel: string;

  /** Zone members */
  zoneMembers: string[];

  /** Access rules */
  accessRules: ZoneAccessRule[];
}

export interface ZoneAccessRule {
  /** Rule ID */
  ruleId: string;

  /** Source zone */
  sourceZone: string;

  /** Destination zone */
  destinationZone: string;

  /** Allowed protocols */
  allowedProtocols: string[];

  /** Allowed ports */
  allowedPorts: string[];

  /** Rule action */
  ruleAction: string;
}

export interface SecurityControlInventory {
  /** Physical controls */
  physicalControls: SecurityControl[];

  /** Technical controls */
  technicalControls: SecurityControl[];

  /** Administrative controls */
  administrativeControls: SecurityControl[];

  /** Control effectiveness */
  controlEffectiveness: ControlEffectiveness[];
}

export interface SecurityControl {
  /** Control ID */
  controlId: string;

  /** Control name */
  controlName: string;

  /** Control type */
  controlType: string;

  /** Control description */
  controlDescription: string;

  /** Implementation status */
  implementationStatus: string;

  /** Control effectiveness */
  effectiveness: string;

  /** Control owner */
  controlOwner: string;

  /** Testing results */
  testingResults: string[];
}

export interface ControlEffectiveness {
  /** Control ID */
  controlId: string;

  /** Effectiveness score */
  effectivenessScore: number;

  /** Testing date */
  testingDate: Date;

  /** Testing methodology */
  testingMethodology: string;

  /** Findings */
  findings: string[];

  /** Recommendations */
  recommendations: string[];
}

export interface RawDataAppendix {
  /** Configuration files */
  configurationFiles: RawConfigurationFile[];

  /** Log files */
  logFiles: RawLogFile[];

  /** Scan results */
  scanResults: RawScanResult[];

  /** System outputs */
  systemOutputs: RawSystemOutput[];
}

export interface RawConfigurationFile {
  /** File path */
  filePath: string;

  /** File content */
  fileContent: string;

  /** File hash */
  fileHash: string;

  /** Collection timestamp */
  collectionTimestamp: Date;
}

export interface RawLogFile {
  /** Log file path */
  logFilePath: string;

  /** Log entries */
  logEntries: LogEntry[];

  /** Collection timestamp */
  collectionTimestamp: Date;
}

export interface LogEntry {
  /** Timestamp */
  timestamp: Date;

  /** Log level */
  logLevel: string;

  /** Message */
  message: string;

  /** Source */
  source: string;

  /** Additional data */
  additionalData: Record<string, string | number | boolean | null>;
}

export interface RawScanResult {
  /** Scan type */
  scanType: string;

  /** Scan target */
  scanTarget: string;

  /** Scan output */
  scanOutput: string;

  /** Scan timestamp */
  scanTimestamp: Date;

  /** Scan duration */
  scanDuration: number;
}

export interface RawSystemOutput {
  /** Command */
  command: string;

  /** Output */
  output: string;

  /** Error output */
  errorOutput: string;

  /** Exit code */
  exitCode: number;

  /** Execution timestamp */
  executionTimestamp: Date;
}

export interface ToolOutputsAppendix {
  /** Tool results */
  toolResults: ToolResult[];

  /** Tool logs */
  toolLogs: ToolLog[];

  /** Tool configuration */
  toolConfigurations: ToolConfiguration[];
}

/**
 * Tool result data structures for different security analysis tools
 */
export type ToolResultData =
  | DockerScanResult
  | DatabaseScanResult
  | ServiceScanResult
  | VulnerabilityScanResult
  | ComplianceScanResult;

/**
 * Docker security scan results
 */
export interface DockerScanResult {
  scanType: "docker" | "docker-compose" | "dockerfile";
  containers: ContainerScanResult[];
  images: ImageScanResult[];
  networks: NetworkScanResult[];
  volumes: VolumeScanResult[];
}

export interface ContainerScanResult {
  containerId: string;
  containerName: string;
  imageId: string;
  status: string;
  securityFindings: SecurityFinding[];
}

export interface ImageScanResult {
  imageId: string;
  imageName: string;
  vulnerabilities: VulnerabilityDetail[];
  layers: LayerScanResult[];
}

export interface LayerScanResult {
  layerId: string;
  command: string;
  size: number;
  vulnerabilities: VulnerabilityDetail[];
}

export interface VulnerabilityDetail {
  cveId: string;
  severity: SecuritySeverity;
  packageName: string;
  packageVersion: string;
  fixedVersion?: string;
  description: string;
}

export interface NetworkScanResult {
  networkId: string;
  networkName: string;
  driver: string;
  attachedContainers: string[];
  securityIssues: string[];
}

export interface VolumeScanResult {
  volumeName: string;
  mountPath: string;
  permissions: string;
  securityIssues: string[];
}

/**
 * Database security scan results
 */
export interface DatabaseScanResult {
  databaseType: "postgresql" | "mysql" | "sqlite" | "mongodb";
  connectionString: string;
  version: string;
  configuration: DatabaseConfigAnalysis;
  userAccounts: DatabaseUserAnalysis[];
  privileges: DatabasePrivilegeAnalysis[];
}

export interface DatabaseConfigAnalysis {
  encryption: boolean;
  authentication: string[];
  logging: boolean;
  auditTrail: boolean;
  securityIssues: SecurityFinding[];
}

export interface DatabaseUserAnalysis {
  username: string;
  privileges: string[];
  lastLogin?: Date;
  securityIssues: string[];
}

export interface DatabasePrivilegeAnalysis {
  privilege: string;
  grantedTo: string[];
  scope: string;
  riskLevel: SecuritySeverity;
}

/**
 * Service security scan results
 */
export interface ServiceScanResult {
  serviceName: string;
  serviceType: "web" | "api" | "database" | "cache" | "message-queue";
  endpoints: ServiceEndpointResult[];
  authentication: AuthenticationAnalysis;
  encryption: EncryptionAnalysis;
  headers: SecurityHeaderAnalysis[];
}

export interface ServiceEndpointResult {
  endpoint: string;
  method: string;
  authentication: boolean;
  encryption: boolean;
  vulnerabilities: SecurityFinding[];
}

export interface AuthenticationAnalysis {
  enabled: boolean;
  methods: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface EncryptionAnalysis {
  enabled: boolean;
  protocols: string[];
  ciphers: string[];
  certificates: CertificateAnalysis[];
}

export interface CertificateAnalysis {
  subject: string;
  issuer: string;
  validFrom: Date;
  validTo: Date;
  algorithm: string;
  keySize: number;
  issues: string[];
}

export interface SecurityHeaderAnalysis {
  headerName: string;
  present: boolean;
  value?: string;
  recommendations: string[];
}

/**
 * Generic vulnerability scan results
 */
export interface VulnerabilityScanResult {
  target: string;
  scanType: string;
  vulnerabilities: VulnerabilityFinding[];
  summary: VulnerabilitySummary;
}

export interface VulnerabilityFinding {
  id: string;
  title: string;
  severity: SecuritySeverity;
  cveId?: string;
  cweId?: string;
  description: string;
  solution: string;
  references: string[];
}

export interface VulnerabilitySummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/**
 * Compliance scan results
 */
export interface ComplianceScanResult {
  standard: string;
  version: string;
  controls: ComplianceControl[];
  overallScore: number;
  summary: ComplianceSummary;
}

export interface ComplianceControl {
  controlId: string;
  title: string;
  status: "pass" | "fail" | "partial" | "not-applicable";
  findings: SecurityFinding[];
  recommendations: string[];
}

export interface ComplianceSummary {
  totalControls: number;
  passedControls: number;
  failedControls: number;
  partialControls: number;
  notApplicableControls: number;
}

/**
 * Tool configuration data structures
 */
export type ToolConfigurationData =
  | DockerToolConfig
  | DatabaseToolConfig
  | ServiceToolConfig
  | GeneralToolConfig;

export interface DockerToolConfig {
  registryAuth?: {
    username: string;
    password: string;
    registry: string;
  };
  scanImages: boolean;
  scanContainers: boolean;
  includeSecrets: boolean;
  outputFormat: "json" | "xml" | "sarif";
}

export interface DatabaseToolConfig {
  connectionTimeout: number;
  maxConnections: number;
  scanUserAccounts: boolean;
  scanPrivileges: boolean;
  includeSystemTables: boolean;
}

export interface ServiceToolConfig {
  maxRedirects: number;
  timeout: number;
  userAgent: string;
  includeHeaders: boolean;
  followRedirects: boolean;
  verifyCertificates: boolean;
}

export interface GeneralToolConfig {
  verboseOutput: boolean;
  parallelScans: number;
  outputDirectory: string;
  reportFormat: string[];
  includeRawData: boolean;
}

export interface ToolResult {
  /** Tool name */
  toolName: string;

  /** Tool version */
  toolVersion: string;

  /** Execution timestamp */
  executionTimestamp: Date;

  /** Result data - typed based on tool type */
  resultData: ToolResultData;

  /** Result format */
  resultFormat: string;
}

export interface ToolLog {
  /** Tool name */
  toolName: string;

  /** Log entries */
  logEntries: LogEntry[];

  /** Log level */
  logLevel: string;
}

export interface ToolConfiguration {
  /** Tool name */
  toolName: string;

  /** Configuration data - typed based on tool requirements */
  configurationData: ToolConfigurationData;

  /** Configuration file */
  configurationFile: string;
}

/**
 * Docker Compose service configuration interfaces
 */
export interface DockerComposeService {
  image?: string;
  build?: string | DockerComposeBuild;
  command?: string | string[];
  entrypoint?: string | string[];
  environment?: string[] | Record<string, string>;
  ports?: string[] | DockerComposePort[];
  volumes?: string[] | DockerComposeVolumeMount[];
  networks?: string[] | Record<string, DockerComposeNetworkConfig>;
  depends_on?: string[] | Record<string, DockerComposeDependency>;
  privileged?: boolean;
  user?: string;
  working_dir?: string;
  restart?: string;
  cap_add?: string[];
  cap_drop?: string[];
  security_opt?: string[];
  tmpfs?: string[] | Record<string, string>;
  ulimits?: Record<string, number | DockerComposeUlimit>;
  labels?: string[] | Record<string, string>;
  logging?: DockerComposeLogging;
  healthcheck?: DockerComposeHealthCheck;
  deploy?: DockerComposeDeploy;
  network_mode?: string;
  pid?: string;
  ipc?: string;
  stdin_open?: boolean;
  tty?: boolean;
  container_name?: string; // Added from first interface (was containerName, standardized to Docker Compose naming)
  [key: string]: unknown; // Allow additional Docker Compose service properties
}

export interface DockerComposeBuild {
  context: string;
  dockerfile?: string;
  args?: Record<string, string>;
  labels?: Record<string, string>;
  target?: string;
}

export interface DockerComposePort {
  target: number;
  published: number;
  protocol?: "tcp" | "udp";
  mode?: "host" | "ingress";
}

export interface DockerComposeVolumeMount {
  type: "bind" | "volume" | "tmpfs";
  source: string;
  target: string;
  read_only?: boolean;
  bind?: {
    propagation?: string;
  };
  volume?: {
    nocopy?: boolean;
  };
  tmpfs?: {
    size?: string;
  };
}

export interface DockerComposeNetworkConfig {
  aliases?: string[];
  ipv4_address?: string;
  ipv6_address?: string;
  priority?: number;
}

export interface DockerComposeDependency {
  condition:
    | "service_started"
    | "service_healthy"
    | "service_completed_successfully";
}

export interface DockerComposeUlimit {
  soft: number;
  hard: number;
}

export interface DockerComposeLogging {
  driver?: string;
  options?: Record<string, string>;
}

export interface DockerComposeHealthCheck {
  test?: string | string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  start_period?: string;
}

export interface DockerComposeDeploy {
  replicas?: number;
  resources?: DockerComposeResources;
  restart_policy?: DockerComposeRestartPolicy;
  labels?: Record<string, string>;
  placement?: DockerComposePlacement;
}

export interface DockerComposeResources {
  limits?: {
    cpus?: string;
    memory?: string;
  };
  reservations?: {
    cpus?: string;
    memory?: string;
  };
}

export interface DockerComposeRestartPolicy {
  condition?: "none" | "on-failure" | "any";
  delay?: string;
  max_attempts?: number;
  window?: string;
}

export interface DockerComposePlacement {
  constraints?: string[];
  preferences?: Array<Record<string, string>>;
}

/**
 * Docker network configuration interface
 */
export interface DockerNetwork {
  driver?: string;
  driver_opts?: Record<string, string>;
  ipam?: DockerNetworkIPAM;
  external?: boolean | { name: string };
  internal?: boolean;
  attachable?: boolean;
  labels?: Record<string, string>;
  enable_ipv6?: boolean;
}

export interface DockerNetworkIPAM {
  driver?: string;
  config?: DockerNetworkIPAMConfig[];
  options?: Record<string, string>;
}

export interface DockerNetworkIPAMConfig {
  subnet?: string;
  ip_range?: string;
  gateway?: string;
  aux_addresses?: Record<string, string>;
}

/**
 * Docker instruction interfaces for typed parsing
 */
export interface DockerInstruction {
  instruction: string;
  arguments: string[];
  raw: string;
  lineNumber: number;
}

export interface DockerUserInstruction extends DockerInstruction {
  instruction: "USER";
  user: string;
  group?: string;
}

export interface DockerCopyInstruction extends DockerInstruction {
  instruction: "COPY" | "ADD";
  source: string[];
  destination: string;
  chown?: string;
  chmod?: string;
}

export interface DockerRunInstruction extends DockerInstruction {
  instruction: "RUN";
  command: string;
  shell: boolean; // true if shell form, false if exec form
}

export interface DockerExposeInstruction extends DockerInstruction {
  instruction: "EXPOSE";
  ports: number[];
  protocols: string[];
}

/**
 * Risk summary, recommendations, and compliance assessment return types
 */
export interface RiskSummary {
  overall: SecuritySeverity;
  riskLevel?: string;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  score: number; // 0-100 risk score
  riskFactors: RiskFactor[];
}

export interface RiskFactor {
  factor: string;
  impact: SecuritySeverity;
  description: string;
  weight: number;
}

export interface ComplianceAssessment {
  framework: string;
  version: string;
  overallScore: number; // 0-100 compliance score
  passedControls: number;
  failedControls: number;
  totalControls: number;
  controlResults: ComplianceControlResult[];
  recommendations: string[];
}

export interface ComplianceControlResult {
  controlId: string;
  title: string;
  status: "pass" | "fail" | "partial" | "not-applicable";
  score: number;
  findings: string[]; // Finding IDs
  evidence: string[];
  remediation?: string;
}

export interface ReferencesAppendix {
  /** Security standards */
  securityStandards: SecurityStandard[];

  /** Compliance frameworks */
  complianceFrameworks: ComplianceFrameworkReference[];

  /** Vulnerability databases */
  vulnerabilityDatabases: VulnerabilityDatabaseReference[];

  /** External resources */
  externalResources: ExternalResource[];
}

export interface SecurityStandard {
  /** Standard name */
  name: string;

  /** Standard version */
  version: string;

  /** Standard description */
  description: string;

  /** Standard URL */
  url: string;

  /** Relevant sections */
  relevantSections: string[];
}

export interface ComplianceFrameworkReference {
  /** Framework name */
  name: string;

  /** Framework version */
  version: string;

  /** Framework description */
  description: string;

  /** Framework URL */
  url: string;

  /** Applicable controls */
  applicableControls: string[];
}

export interface VulnerabilityDatabaseReference {
  /** Database name */
  name: string;

  /** Database URL */
  url: string;

  /** Database description */
  description: string;

  /** Last update */
  lastUpdate: Date;

  /** Update frequency */
  updateFrequency: string;
}

export interface ExternalResource {
  /** Resource title */
  title: string;

  /** Resource URL */
  url: string;

  /** Resource type */
  type: string;

  /** Resource description */
  description: string;

  /** Access date */
  accessDate: Date;
}

export interface GlossaryAppendix {
  /** Glossary entries */
  entries: GlossaryEntry[];
}

export interface GlossaryEntry {
  /** Term */
  term: string;

  /** Definition */
  definition: string;

  /** Acronym */
  acronym?: string;

  /** Related terms */
  relatedTerms: string[];
}

/**
 * Image vulnerability information
 */
export interface ImageVulnerability {
  /** Vulnerability ID (CVE, etc.) */
  id: string;

  /** Vulnerability description */
  description: string;

  /** Severity level */
  severity: SecuritySeverity;

  /** Package name */
  package: string;

  /** Package version */
  version: string;

  /** Fixed version (if available) */
  fixedVersion?: string;

  /** CVSS score */
  cvssScore?: number;
}

/**
 * File Analysis Target Type
 * Renamed from AnalysisTarget to avoid conflict with the primary analysis target interface
 */
export interface FileAnalysisTarget {
  /** Target type */
  type: "file" | "directory" | "url" | "container" | "image";

  /** Target path or URL */
  target: string;

  /** Additional options */
  options?: Record<string, unknown>;
}

/**
 * Command result interface for type safety
 */
export interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * Type guard for CommandResult
 */
export function isCommandResult(obj: unknown): obj is CommandResult {
  return (
    Boolean(obj) &&
    typeof obj === "object" &&
    obj !== null &&
    "stdout" in obj &&
    "stderr" in obj &&
    typeof (obj as Record<string, unknown>).stdout === "string" &&
    typeof (obj as Record<string, unknown>).stderr === "string"
  );
}

/**
 * Vulnerability Assessment interface
 */
export interface VulnerabilityAssessment {
  total_vulnerabilities: number;
  exploitable_vulnerabilities: number;
  false_positive_likelihood: {
    very_low: number;
    low: number;
    medium: number;
    high: number;
    very_high: number;
  };
  attack_vectors: string[];
  affected_assets: string[];
}

/**
 * Compliance Report interface
 */
export interface ComplianceReport {
  framework_compliance: Record<
    string,
    {
      covered_controls: number;
      passed_controls: number;
      compliance_percentage: number;
    }
  >;
  regulatory_compliance: {
    gaps_identified: number;
    recommendations: string[];
  };
}

/**
 * Remediation Recommendation interface
 */
export interface RemediationRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  impact: string;
  effort: "low" | "medium" | "high";
  timeframe: string;
}

/**
 * Service Session Configuration Interface
 */
export interface ServiceSessionConfig {
  secret?: string;
  name?: string;
  resave?: boolean;
  saveUninitialized?: boolean;
  cookie?: {
    secure?: boolean;
    httpOnly?: boolean;
    maxAge?: number;
    sameSite?: string;
  };
  store?: string;
  rolling?: boolean;
  unset?: string;
  [key: string]: unknown;
}

/**
 * Service Express Rate Limiting Configuration Interface
 * Renamed from ServiceRateLimitConfig to avoid conflict with the structured rate limit config
 */
export interface ServiceExpressRateLimitConfig {
  enabled?: boolean;
  windowMs?: number;
  max?: number;
  delayMs?: number;
  delayAfter?: number;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: string;
  [key: string]: unknown;
}

/**
 * Service Express Input Validation Configuration Interface
 * Renamed from ServiceInputValidationConfig to avoid conflict with the structured validation config
 */
export interface ServiceExpressInputValidationConfig {
  enabled?: boolean;
  sanitize?: boolean;
  validateHeaders?: boolean;
  validateBody?: boolean;
  validateQuery?: boolean;
  maxBodySize?: string;
  allowedContentTypes?: string[];
  schema?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Service Express CSRF Configuration Interface
 * Renamed from ServiceCSRFConfig to avoid conflict with the structured CSRF config
 */
export interface ServiceExpressCSRFConfig {
  enabled?: boolean;
  secret?: string;
  cookie?: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: string;
  };
  ignoreMethods?: string[];
  value?: string;
  [key: string]: unknown;
}

/**
 * Service Logging Configuration Interface
 */
export interface ServiceLoggingConfig {
  enabled?: boolean;
  level?: string;
  format?: string;
  destination?: string;
  maxFileSize?: string;
  maxFiles?: number;
  compress?: boolean;
  datePattern?: string;
  auditLog?: boolean;
  [key: string]: unknown;
}

/**
 * JWT Security Configuration Interface
 */
export interface JWTSecurityConfig {
  algorithm?: string;
  secret?: string;
  publicKey?: string;
  privateKey?: string;
  expiresIn?: string | number;
  issuer?: string;
  audience?: string;
  subject?: string;
  notBefore?: string | number;
  clockTolerance?: number;
  ignoreExpiration?: boolean;
  ignoreNotBefore?: boolean;
  clockTimestamp?: number;
  [key: string]: unknown;
}

/**
 * OAuth Security Configuration Interface
 */
export interface OAuthSecurityConfig {
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scope?: string | string[];
  responseType?: string;
  grantType?: string;
  tokenEndpoint?: string;
  authorizationEndpoint?: string;
  introspectionEndpoint?: string;
  revocationEndpoint?: string;
  jwksUri?: string;
  issuer?: string;
  state?: string;
  pkce?: boolean;
  [key: string]: unknown;
}

/**
 * Docker Container Inspect Data Interface
 */
export interface DockerContainerInspectData {
  Id?: string;
  Name?: string;
  Config?: {
    Env?: string[];
    User?: string;
    WorkingDir?: string;
    Cmd?: string[];
    Entrypoint?: string[];
    ExposedPorts?: Record<string, Record<string, unknown>>;
    Volumes?: Record<string, Record<string, unknown>>;
    Labels?: Record<string, string>;
  };
  HostConfig?: {
    Privileged?: boolean;
    PublishAllPorts?: boolean;
    ReadonlyRootfs?: boolean;
    Memory?: number;
    CpuPeriod?: number;
    CpuQuota?: number;
    PidsLimit?: number;
    Ulimits?: Array<{
      Name?: string;
      Hard?: number;
      Soft?: number;
    }>;
    SecurityOpt?: string[];
    CapAdd?: string[];
    CapDrop?: string[];
  };
  Mounts?: Array<{
    Type?: string;
    Source?: string;
    Destination?: string;
    RW?: boolean;
    Propagation?: string;
  }>;
  NetworkSettings?: {
    Ports?: Record<
      string,
      Array<{
        HostIp?: string;
        HostPort?: string;
      }>
    >;
  };
  [key: string]: unknown;
}

// DockerVolumeMount interface already defined above with better documentation and optional bindPropagation

// DockerResourceLimits interface already defined above with better documentation

// Note: Remove default export to fix TypeScript errors
// Individual types are already exported above
