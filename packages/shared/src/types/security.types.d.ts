interface RequestLike {
  ip?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string | string[]>;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
}
export declare enum SecurityEventType {
  _AUTHENTICATION_FAILED = "authentication_failed",
  _LOGIN_SUCCESS = "auth.login.success",
  _LOGIN_FAILED = "auth.login.failed",
  _LOGOUT = "auth.logout",
  _TOKEN_REFRESH = "auth.token.refresh",
  _ACCESS_GRANTED = "authz.access.granted",
  _ACCESS_DENIED = "access_denied",
  _PERMISSION_ESCALATION_ATTEMPT = "authz.escalation.attempt",
  _SUSPICIOUS_ACTIVITY = "suspicious_activity",
  _SECURITY_CONFIG_CHANGED = "security_config_changed",
  _DATA_ACCESS_VIOLATION = "data_access_violation",
  _CSP_VIOLATION = "csp_violation",
  _ADMIN_ACTION = "security.admin.action",
  _MALFORMED_REQUEST = "malformed_request",
  _CORS_VIOLATION = "cors_violation",
  _VALIDATION_FAILED = "validation_failed",
  _XSS_ATTEMPT_BLOCKED = "xss_attempt_blocked",
  _INJECTION_ATTEMPT_BLOCKED = "injection_attempt_blocked",
  _RATE_LIMIT_EXCEEDED = "rate_limit.exceeded",
}
export declare enum RateLimitServiceType {
  _BYTEBOTD = "bytebotd",
  _BYTEBOT_AGENT = "bytebot-agent",
  _BYTEBOT_UI = "bytebot-ui",
  _SHARED = "shared",
}
export interface XSSDetectionResult {
  hasXSS: boolean;
  threats: string[];
  riskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  detectionContext: string[];
}
export interface SQLInjectionDetectionResult {
  hasInjection: boolean;
  threats: string[];
  riskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  detectionContext: string[];
  databaseType?: string;
}
export interface CommandInjectionDetectionResult {
  hasInjection: boolean;
  threats: string[];
  riskScore: number;
  severity: "low" | "medium" | "high" | "critical";
  confidence: number;
  detectionContext: string[];
  attackVectors?: string[];
  platform?: string;
}
export interface FilePathValidationResult {
  isValid: boolean;
  errors?: string[];
  riskScore?: number;
  severity?: "low" | "medium" | "high" | "critical";
  detectionContext?: string[];
}
export interface CoordinatesValidationResult {
  isValid: boolean;
  errors?: string[];
  riskScore?: number;
  severity?: "low" | "medium" | "high" | "critical";
  isOverflow?: boolean;
  normalizedCoordinates?: {
    x: number;
    y: number;
  };
}
export interface SecurityEvent {
  eventId: string;
  type: SecurityEventType;
  timestamp: Date;
  riskScore: number;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  endpoint: string;
  method: string;
  success?: boolean;
  message?: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
  serviceName?: string;
  environment?: string;
  origin?: string;
  reason?: string;
  blocked?: boolean;
}
export declare function createSecurityEvent(
  type: SecurityEventType,
  endpoint: string,
  method: string,
  success?: boolean,
  message?: string,
  metadata?: Record<string, unknown>,
  userId?: string,
  ipAddress?: string,
  userAgent?: string,
): SecurityEvent;
export declare const DEFAULT_SANITIZATION_OPTIONS: {
  stripHtml: boolean;
  normalizeWhitespace: boolean;
  maxLength: number;
  allowedCharsets: string[];
  removeControlChars: boolean;
  escapeSpecialChars: boolean;
};
export declare enum UserRole {
  _ADMIN = "admin",
  _OPERATOR = "operator",
  _VIEWER = "viewer",
  _USER = "user",
  _GUEST = "guest",
}
export declare enum Permission {
  _TASK_READ = "task:read",
  _TASK_WRITE = "task:write",
  _TASK_DELETE = "task:delete",
  _COMPUTER_CONTROL = "computer:control",
  _COMPUTER_VIEW = "computer:view",
  _SYSTEM_ADMIN = "system:admin",
  _USER_MANAGE = "user:manage",
  _METRICS_VIEW = "metrics:view",
  _LOGS_VIEW = "logs:view",
  _EXECUTE = "execute",
  _ADMIN = "admin",
  _CONFIGURE = "configure",
  _MONITOR = "monitor",
  _USER_MANAGEMENT = "user:management",
  _TASK_MANAGEMENT = "task:management",
  _SYSTEM_MANAGEMENT = "system:management",
  _AUDIT_ACCESS = "audit:access",
  _SECURITY_MANAGEMENT = "security:management",
  _API_ACCESS = "api:access",
  _API_WRITE = "api:write",
  _API_ADMIN = "api:admin",
  _COMPUTER_USE = "computer:use",
  _COMPUTER_ADMIN = "computer:admin",
  _SCREEN_CAPTURE = "screen:capture",
  _FILE_ACCESS = "file:access",
  _CREATE_USER = "create:user",
  _DELETE_USER = "delete:user",
  _VIEW_ADMIN_PANEL = "view:admin_panel",
  _CREATE_TASK = "create:task",
  _VIEW_OWN_PROFILE = "view:own_profile",
  _VIEW_PUBLIC_CONTENT = "view:public_content",
}
export interface JwtPayload {
  sub: string;
  userId?: string;
  email?: string;
  role: UserRole;
  permissions?: Permission[];
  iat: number;
  exp: number;
  iss: string;
  sessionId: string;
  type: "access" | "refresh" | "id";
  ipAddress?: string;
}
export declare class AuthCredentialsDto {
  email: string;
  password: string;
}
export declare class RegisterUserDto extends AuthCredentialsDto {
  firstName: string;
  lastName: string;
  role: UserRole;
}
export interface AuthTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: Permission[];
  };
}
export interface ValidationError {
  field: string;
  constraint: string;
  message: string;
  rejectedValue: unknown;
}
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  sanitizedData?: Record<string, unknown> | unknown[];
  timestamp: Date;
  score?: number;
}
export interface SanitizationOptions {
  allowHtml?: boolean;
  stripHtml: boolean;
  allowedTags?: string[];
  allowedAttributes?: Record<string, string[]>;
  maxLength?: number;
  normalizeWhitespace: boolean;
  allowedCharsets?: string[];
  removeControlChars: boolean;
  escapeSpecialChars: boolean;
  trim?: boolean;
}
export interface RateLimitConfig {
  max: number;
  windowMs: number;
  message: string;
  skip?: (_req: RequestLike) => boolean;
  keyGenerator?: (_req: RequestLike) => string;
}
export declare enum RateLimitPreset {
  _AUTH = "auth",
  _COMPUTER_USE = "computer-use",
  _TASK_OPERATIONS = "task-operations",
  _READ_OPERATIONS = "read-operations",
  _WEBSOCKET = "websocket",
}
export interface JwtConfig {
  secret: string;
  accessTokenExpiry: string;
  refreshTokenExpiry: string;
  issuer: string;
  audience: string;
  algorithm: string;
}
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  minSpecialChars?: number;
  forbiddenPatterns?: string[];
  saltRounds: number;
}
export interface SecurityHeadersConfig {
  csp: boolean;
  cspDirectives?: Record<string, string[]>;
  hsts: boolean;
  hstsMaxAge: number;
  frameOptions: boolean;
  frameOptionsValue: "DENY" | "SAMEORIGIN" | "ALLOW-FROM";
  noSniff: boolean;
  xssFilter: boolean;
}
export interface CorsConfig {
  origins: string[];
  methods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}
export interface SecurityConfig {
  jwt: JwtConfig;
  passwordPolicy: PasswordPolicy;
  rateLimiting: Record<RateLimitPreset, RateLimitConfig>;
  headers: SecurityHeadersConfig;
  cors: CorsConfig;
  sanitization: SanitizationOptions;
  auditLogging: boolean;
  sessionTimeout: number;
  maxSessionsPerUser: number;
}
export interface ApiVersion {
  version: string;
  releaseDate: Date;
  deprecated: boolean;
  deprecationDate?: Date;
  endOfLifeDate?: Date;
  breakingChanges: string[];
  features: string[];
}
export declare enum VersioningStrategy {
  _URI = "uri",
  _HEADER = "header",
  _QUERY = "query",
  _MEDIA_TYPE = "media-type",
}
export interface RoleMetadata {
  roles: UserRole[];
  requireAll: boolean;
}
export interface PermissionMetadata {
  permissions: Permission[];
  requireAll: boolean;
}
export interface ThrottleMetadata {
  config: RateLimitPreset | RateLimitConfig;
  override: boolean;
}
export declare enum SecurityErrorCode {
  _INVALID_CREDENTIALS = "AUTH_INVALID_CREDENTIALS",
  _TOKEN_EXPIRED = "AUTH_TOKEN_EXPIRED",
  _TOKEN_INVALID = "AUTH_TOKEN_INVALID",
  _TOKEN_MALFORMED = "AUTH_TOKEN_MALFORMED",
  _INSUFFICIENT_PERMISSIONS = "AUTHZ_INSUFFICIENT_PERMISSIONS",
  _ROLE_REQUIRED = "AUTHZ_ROLE_REQUIRED",
  _ACCESS_DENIED = "AUTHZ_ACCESS_DENIED",
  _VALIDATION_FAILED = "VALIDATION_FAILED",
  _XSS_DETECTED = "VALIDATION_XSS_DETECTED",
  _INJECTION_DETECTED = "VALIDATION_INJECTION_DETECTED",
  _REQUEST_TOO_LARGE = "VALIDATION_REQUEST_TOO_LARGE",
  _RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  _TOO_MANY_REQUESTS = "RATE_LIMIT_TOO_MANY_REQUESTS",
  _SECURITY_CONFIG_ERROR = "SECURITY_CONFIG_ERROR",
  _INTERNAL_SECURITY_ERROR = "SECURITY_INTERNAL_ERROR",
}
export interface SecurityError {
  code: SecurityErrorCode;
  message: string;
  details?: string;
  timestamp: Date;
  path: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
}
declare const _default: {
  UserRole: typeof UserRole;
  Permission: typeof Permission;
  SecurityEventType: typeof SecurityEventType;
  RateLimitPreset: typeof RateLimitPreset;
  VersioningStrategy: typeof VersioningStrategy;
  SecurityErrorCode: typeof SecurityErrorCode;
};
export default _default;
//# sourceMappingURL=security.types.d.ts.map
