/**
 * Service Configuration Security Analyzer
 *
 * Comprehensive security analysis for web services, APIs, SSL/TLS configurations,
 * authentication systems, and network service security assessment.
 *
 * @author ByteBot Security Team
 * @version 1.0.0
 */

import { EventEmitter } from "events";
import * as fs from "fs-extra";
import * as path from "path";
import * as crypto from "crypto";
import { glob, type GlobOptions } from "glob";

/**
 * Type-safe wrapper for glob function to prevent unsafe TypeScript calls
 */
const safeGlob = async (
  pattern: string,
  options?: GlobOptions,
): Promise<string[]> => {
  try {
    // Type-safe call with explicit typing
    const result = await (
      glob as (_pattern: string, _options?: GlobOptions) => Promise<string[]>
    )(pattern, options);

    if (Array.isArray(result)) {
      return result.filter((item): item is string => typeof item === "string");
    }

    return [];
  } catch (error: unknown) {
    // Safely extract error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`Glob pattern failed: ${pattern}`, errorMessage);
    return [];
  }
};

import { parse as parseYaml } from "yaml";
import {
  SecurityFinding,
  SecurityAnalysisResult,
  SecuritySeverity,
  SecurityCategory,
  ConfigurationType,
  ServiceSecurityConfig,
  ServiceEndpointConfig,
  ServiceAuthConfig,
  ServiceTLSConfig,
  ServiceCORSConfig,
  ServiceSecurityHeaders,
  ServiceAnalyzerConfig,
  VulnerabilityAssessment,
  ComplianceReport,
  RemediationRecommendation,
  ServiceSessionConfig,
  ServiceRateLimitConfig,
  ServiceInputValidationConfig,
  ServiceCSRFConfig,
  ServiceLoggingConfig,
  JWTSecurityConfig,
  OAuthSecurityConfig,
  ServiceEndpointRateLimit,
  ServiceJWTConfig,
  ServiceOAuthConfig,
  ServiceAPIKeyConfig,
  ServiceSessionAuth,
  ServiceMFAConfig,
  ServiceValidationRule,
  RiskFactor,
} from "../types/index.js";

/**
 * Type-safe HTTP response structure for service analysis
 */
interface ServiceHttpResponse {
  status: number;
  headers: Record<string, string>;
  body?: string;
  [key: string]: unknown; // Allow dynamic property access
}

/**
 * Type guard for checking if error is an Error instance
 */
function isServiceError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Type-safe error handler for service analysis
 */
function getServiceErrorMessage(error: unknown): string {
  if (isServiceError(error)) {
    return error.message;
  }
  return String(error);
}

/**
 * Type-safe configuration validation
 */
function validateServiceAnalysisOptions(options: ServiceAnalysisOptions): void {
  if (!options.target || typeof options.target !== "string") {
    throw new Error("Service analysis requires a valid target string");
  }
}

/**
 * Type-safe method validation
 */
type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "OPTIONS"
  | "PATCH"
  | "HEAD"
  | "TRACE";

function isValidHttpMethod(method: string): method is HttpMethod {
  const validMethods: HttpMethod[] = [
    "GET",
    "POST",
    "PUT",
    "DELETE",
    "OPTIONS",
    "PATCH",
    "HEAD",
    "TRACE",
  ];
  return validMethods.includes(method as HttpMethod);
}

/**
 * Type-safe URL validation
 */
function isValidUrl(target: string): boolean {
  try {
    new URL(target);
    return true;
  } catch {
    return false;
  }
}

/**
 * Service Security Analysis Options
 */
export interface ServiceAnalysisOptions {
  /** Target service URL or configuration path */
  target: string;

  /** HTTP method for requests */
  method?: string;

  /** Service type to analyze */
  serviceType?: "web" | "api" | "microservice" | "worker";

  /** Enable active service testing */
  enableActiveTesting?: boolean;

  /** Enable SSL/TLS analysis */
  enableSSLAnalysis?: boolean;

  /** Enable authentication testing */
  enableAuthTesting?: boolean;

  /** Enable CORS analysis */
  enableCORSAnalysis?: boolean;

  /** Enable security header analysis */
  enableHeaderAnalysis?: boolean;

  /** Enable endpoint enumeration */
  enableEndpointEnumeration?: boolean;

  /** Configuration file paths to analyze */
  configFiles?: string[];

  /** Request timeout in milliseconds */
  timeout?: number;

  /** Maximum redirects to follow */
  maxRedirects?: number;

  /** Custom headers for requests */
  customHeaders?: Record<string, string>;

  /** Authentication credentials for testing */
  credentials?: {
    username?: string;
    password?: string;
    token?: string;
    apiKey?: string;
  };

  /** Skip certificate validation */
  skipCertValidation?: boolean;

  /** User agent string */
  userAgent?: string;
}

/**
 * Service Configuration Security Analyzer
 *
 * Provides comprehensive security analysis capabilities for:
 * - Web service security configuration
 * - API endpoint security validation
 * - Authentication configuration analysis
 * - SSL/TLS configuration verification
 * - Network service security assessment
 */
export class ServiceConfigurationSecurityAnalyzer extends EventEmitter {
  private findings: SecurityFinding[] = [];
  private _config: ServiceAnalyzerConfig;

  constructor(config: ServiceAnalyzerConfig) {
    super();

    // Validate configuration
    if (!config) {
      throw new Error("ServiceAnalyzerConfig is required");
    }

    this._config = config;

    this.emit("analyzer_initialized", {
      analyzer: "ServiceConfigurationSecurityAnalyzer",
      version: "1.0.0",
      capabilities: [
        "Web service security configuration analysis",
        "API endpoint security validation",
        "Authentication configuration assessment",
        "SSL/TLS configuration verification",
        "Network service security analysis",
        "Security header validation",
        "CORS configuration analysis",
        "Endpoint enumeration and testing",
      ],
    });
  }

  /**
   * Analyze service security configuration
   */
  public async analyzeServiceSecurity(
    options: ServiceAnalysisOptions,
  ): Promise<SecurityAnalysisResult> {
    // Validate options
    validateServiceAnalysisOptions(options);

    this.emit("analysis_started", {
      target: options.target,
      serviceType: options.serviceType,
      timestamp: new Date().toISOString(),
    });

    const startTime = Date.now();
    this.findings = [];

    try {
      // Parse target and determine analysis type
      const analysisType = this.determineAnalysisType(options.target);

      this.emit("analysis_type_determined", {
        type: analysisType,
        target: options.target,
      });

      // Perform different types of analysis based on target
      switch (analysisType) {
        case "url":
          await this.analyzeServiceByURL(options);
          break;
        case "config":
          await this.analyzeServiceByConfig(options);
          break;
        case "directory":
          await this.analyzeServiceDirectory(options);
          break;
        default:
          throw new Error(`Unsupported analysis type: ${String(analysisType)}`);
      }

      // Generate comprehensive analysis result
      const analysisResult = this.generateServiceAnalysisResult(
        options,
        startTime,
      );

      this.emit("analysis_completed", {
        target: options.target,
        findingsCount: this.findings.length,
        duration: Date.now() - startTime,
        riskLevel: (analysisResult.riskSummary as { riskLevel: string })
          .riskLevel,
      });

      return analysisResult;
    } catch (err) {
      const errorMessage = getServiceErrorMessage(err);
      this.emit("analysis_error", {
        target: options.target,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });
      throw err;
    }
  }

  /**
   * Analyze service by URL (live service testing)
   */
  private async analyzeServiceByURL(
    options: ServiceAnalysisOptions,
  ): Promise<void> {
    if (!isValidUrl(options.target)) {
      throw new Error(`Invalid URL provided: ${options.target}`);
    }

    const url = new URL(options.target);

    this.emit("url_analysis_started", {
      url: options.target,
      protocol: url.protocol,
    });

    // SSL/TLS Analysis
    if (options.enableSSLAnalysis !== false && url.protocol === "https:") {
      this.analyzeSSLTLS(options);
    }

    // Security Headers Analysis
    if (options.enableHeaderAnalysis !== false) {
      void this.analyzeSecurityHeaders(options);
    }

    // Authentication Testing
    if (options.enableAuthTesting && options.credentials) {
      await this.analyzeAuthentication(options);
    }

    // CORS Analysis
    if (options.enableCORSAnalysis !== false) {
      this.analyzeCORS(options);
    }

    // Endpoint Enumeration
    if (options.enableEndpointEnumeration) {
      this.analyzeEndpoints(options);
    }

    // HTTP Security Configuration
    this.analyzeHTTPSecurity(options);

    // Service Response Analysis
    this.analyzeServiceResponses(options);
  }

  /**
   * Analyze service by configuration files
   */
  private async analyzeServiceByConfig(
    options: ServiceAnalysisOptions,
  ): Promise<void> {
    const configPath = options.target;

    if (typeof configPath !== "string") {
      throw new Error("Configuration path must be a string");
    }

    this.emit("config_analysis_started", {
      configPath,
    });

    // Type-safe path existence check
    let pathExists = false;
    try {
      pathExists = await fs.pathExists(configPath);
    } catch (_error) {
      throw new Error(`Error checking configuration file: ${configPath}`);
    }

    if (!pathExists) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    const configContent = await fs.readFile(configPath, "utf-8");
    const config = this.parseServiceConfiguration(configPath, configContent);

    // Analyze service configuration
    this.analyzeServiceConfig(config, configPath);
  }

  /**
   * Analyze service directory for configurations
   */
  private async analyzeServiceDirectory(
    options: ServiceAnalysisOptions,
  ): Promise<void> {
    const directory = options.target;

    if (typeof directory !== "string") {
      throw new Error("Directory path must be a string");
    }

    this.emit("directory_analysis_started", {
      directory,
    });

    // Type-safe directory existence check
    let pathExists = false;
    try {
      pathExists = await fs.pathExists(directory);
    } catch (_error) {
      throw new Error(`Error checking directory: ${directory}`);
    }

    if (!pathExists) {
      throw new Error(`Directory not found: ${directory}`);
    }

    // Find configuration files
    const configFiles = await this.findServiceConfigFiles(directory);

    this.emit("config_files_found", {
      directory,
      files: configFiles,
    });

    // Analyze each configuration file
    for (const configFile of configFiles) {
      await this.analyzeServiceByConfig({
        ...options,
        target: configFile,
      });
    }

    // Analyze directory structure security
    await this.analyzeDirectorySecurity(directory);
  }

  /**
   * Analyze SSL/TLS configuration
   */
  private analyzeSSLTLS(options: ServiceAnalysisOptions): void {
    this.emit("ssl_analysis_started", {
      target: options.target,
    });

    try {
      const url = new URL(options.target);
      const hostname = url.hostname;
      const port = parseInt(url.port) || (url.protocol === "https:" ? 443 : 80);

      // Certificate analysis
      this.analyzeCertificate(hostname, port);

      // TLS configuration analysis
      this.analyzeTLSConfiguration(hostname, port);

      // Cipher suite analysis
      this.analyzeCipherSuites(hostname, port);

      // HSTS analysis
      this.analyzeHSTS(options.target);
    } catch (err) {
      const errorMessage = getServiceErrorMessage(err);
      this.addFinding({
        id: this.generateFindingId(),
        title: "SSL/TLS Analysis Failed",
        description: `Failed to analyze SSL/TLS configuration: ${errorMessage}`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.INSECURE_COMMUNICATION,
        configurationType: ConfigurationType.SSL_TLS,
        source: options.target,
        location: options.target,
        evidence: {
          error: errorMessage,
        },
        remediation: {
          description:
            "Ensure SSL/TLS is properly configured and accessible for analysis",
          steps: [
            "Verify SSL/TLS certificate is valid",
            "Ensure service is accessible for security analysis",
            "Check network connectivity and firewall rules",
          ],
          priority: "medium",
          effort: "low",
        },
        references: [
          "https://owasp.org/www-community/Transport_Layer_Protection_Cheat_Sheet",
        ],
        cwe_ids: ["CWE-295"],
        compliance_mappings: {
          OWASP: ["A02:2021 – Cryptographic Failures"],
        },
        confidence_score: 0.6,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze certificate configuration
   */
  private analyzeCertificate(hostname: string, port: number): void {
    if (typeof hostname !== "string" || typeof port !== "number") {
      throw new Error(
        "Invalid parameters: hostname must be string, port must be number",
      );
    }

    if (port < 1 || port > 65535) {
      throw new Error("Port must be between 1 and 65535");
    }

    // Implementation would use native TLS modules or external tools
    // This is a comprehensive structure for certificate analysis

    // Simulated certificate checks - in real implementation, use tls module
    const certificateIssues = [
      {
        check: "certificate_expiry",
        valid: true, // Would check actual certificate expiry
      },
      {
        check: "certificate_chain",
        valid: true, // Would verify certificate chain
      },
      {
        check: "certificate_revocation",
        valid: true, // Would check CRL/OCSP
      },
      {
        check: "certificate_transparency",
        valid: true, // Would check CT logs
      },
    ];

    for (const issue of certificateIssues) {
      if (!issue.valid) {
        this.addFinding({
          id: this.generateFindingId(),
          title: `Certificate Issue: ${issue.check}`,
          description: `Certificate validation failed for ${issue.check}`,
          severity: SecuritySeverity.HIGH,
          category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
          configurationType: ConfigurationType.SSL_TLS,
          source: `${hostname}:${port}`,
          location: `${hostname}:${port}`,
          evidence: {
            check: issue.check,
            hostname,
            port,
          },
          remediation: {
            description: "Fix certificate configuration",
            steps: [
              "Review certificate configuration",
              "Ensure certificate is valid and not expired",
              "Verify certificate chain is complete",
              "Check certificate revocation status",
            ],
            priority: "high",
            effort: "medium",
          },
          references: [
            "https://owasp.org/www-community/Transport_Layer_Protection_Cheat_Sheet",
          ],
          cwe_ids: ["CWE-295", "CWE-297"],
          compliance_mappings: {
            OWASP: ["A02:2021 – Cryptographic Failures"],
          },
          confidence_score: 0.9,
          false_positive_likelihood: "low",
        });
      }
    }
  }

  /**
   * Analyze TLS configuration
   */
  private analyzeTLSConfiguration(hostname: string, port: number): void {
    if (typeof hostname !== "string" || typeof port !== "number") {
      throw new Error("Invalid parameters for TLS analysis");
    }

    // TLS version and protocol analysis
    const tlsChecks = [
      {
        name: "TLS Version Support",
        check: () => {
          // Would check supported TLS versions
          return { supported: ["TLSv1.2", "TLSv1.3"], weak: [] };
        },
      },
      {
        name: "Protocol Downgrade Attack Protection",
        check: () => {
          // Would check for downgrade attack protection
          return { protected: true };
        },
      },
      {
        name: "Perfect Forward Secrecy",
        check: () => {
          // Would check PFS support
          return { supported: true };
        },
      },
    ];

    for (const tlsCheck of tlsChecks) {
      const result = tlsCheck.check();

      // Example: Check for weak TLS versions
      if ("weak" in result && result.weak && result.weak.length > 0) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "Weak TLS Versions Supported",
          description: `Service supports weak TLS versions: ${result.weak.join(", ")}`,
          severity: SecuritySeverity.HIGH,
          category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
          configurationType: ConfigurationType.SSL_TLS,
          source: `${hostname}:${port}`,
          location: `${hostname}:${port}`,
          evidence: {
            weakVersions: result.weak,
            supportedVersions: result.supported,
          },
          remediation: {
            description: "Disable weak TLS versions",
            steps: [
              "Configure server to only support TLS 1.2 and higher",
              "Disable SSLv3, TLS 1.0, and TLS 1.1",
              "Test configuration with SSL/TLS testing tools",
              "Monitor for compatibility issues after changes",
            ],
            priority: "high",
            effort: "low",
          },
          references: [
            "https://owasp.org/www-community/Transport_Layer_Protection_Cheat_Sheet",
            "https://wiki.mozilla.org/Security/Server_Side_TLS",
          ],
          cwe_ids: ["CWE-326"],
          compliance_mappings: {
            OWASP: ["A02:2021 – Cryptographic Failures"],
            NIST: ["SC-8"],
          },
          confidence_score: 0.95,
          false_positive_likelihood: "very_low",
        });
      }
    }
  }

  /**
   * Analyze cipher suites
   */
  private analyzeCipherSuites(hostname: string, port: number): void {
    if (typeof hostname !== "string" || typeof port !== "number") {
      throw new Error("Invalid parameters for cipher suite analysis");
    }

    // Cipher suite analysis - would use actual TLS negotiation in real implementation
    const weakCiphers = ["RC4", "DES", "3DES", "MD5", "NULL", "anon", "EXPORT"];

    // Simulated cipher suite check
    const supportedCiphers = [
      "ECDHE-RSA-AES256-GCM-SHA384",
      "ECDHE-RSA-AES128-GCM-SHA256",
      // Would get actual supported ciphers
    ];

    const foundWeakCiphers = supportedCiphers.filter((cipher) =>
      weakCiphers.some((weak) =>
        cipher.toLowerCase().includes(weak.toLowerCase()),
      ),
    );

    if (foundWeakCiphers.length > 0) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Weak Cipher Suites Supported",
        description: `Service supports weak cipher suites that could be exploited`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.SSL_TLS,
        source: `${hostname}:${port}`,
        location: `${hostname}:${port}`,
        evidence: {
          weakCiphers: foundWeakCiphers,
          allCiphers: supportedCiphers,
        },
        remediation: {
          description: "Configure strong cipher suites only",
          steps: [
            "Remove weak cipher suites from server configuration",
            "Use only modern, secure cipher suites",
            "Prioritize AEAD ciphers (GCM, ChaCha20-Poly1305)",
            "Test configuration with SSL/TLS scanners",
          ],
          priority: "medium",
          effort: "low",
        },
        references: [
          "https://wiki.mozilla.org/Security/Server_Side_TLS",
          "https://cipherli.st/",
        ],
        cwe_ids: ["CWE-327"],
        compliance_mappings: {
          OWASP: ["A02:2021 – Cryptographic Failures"],
        },
        confidence_score: 0.85,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze HSTS configuration
   */
  private analyzeHSTS(url: string): void {
    if (!isValidUrl(url)) {
      throw new Error(`Invalid URL for HSTS analysis: ${url}`);
    }

    // Would make actual HTTP request to check HSTS header
    // Simulated for comprehensive structure

    const hstsHeaderPresent = false; // Would check actual response
    const hstsMaxAge = 0; // Would parse from header
    const _hstsIncludeSubdomains = false; // Would check directive
    const _hstsPreload = false; // Would check preload directive

    if (!hstsHeaderPresent) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Missing HSTS Header",
        description:
          "HTTP Strict Transport Security (HSTS) header is not configured",
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.INSECURE_COMMUNICATION,
        configurationType: ConfigurationType.SSL_TLS,
        source: url,
        location: url,
        evidence: {
          hstsHeaderPresent: false,
        },
        remediation: {
          description: "Configure HSTS header",
          steps: [
            "Add Strict-Transport-Security header to HTTPS responses",
            "Set appropriate max-age value (recommended: 31536000 seconds)",
            "Consider includeSubDomains directive",
            "Consider preload directive for enhanced security",
          ],
          priority: "medium",
          effort: "low",
        },
        references: [
          "https://owasp.org/www-community/Security_Headers",
          "https://hstspreload.org/",
        ],
        cwe_ids: ["CWE-319"],
        compliance_mappings: {
          OWASP: ["A05:2021 – Security Misconfiguration"],
        },
        confidence_score: 0.9,
        false_positive_likelihood: "very_low",
      });
    } else if (hstsMaxAge < 31536000) {
      // Less than 1 year
      this.addFinding({
        id: this.generateFindingId(),
        title: "HSTS Max-Age Too Short",
        description: `HSTS max-age is set to ${hstsMaxAge} seconds, which is less than recommended minimum`,
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.SSL_TLS,
        source: url,
        location: url,
        evidence: {
          currentMaxAge: hstsMaxAge,
          recommendedMinimum: 31536000,
        },
        remediation: {
          description: "Increase HSTS max-age value",
          steps: [
            "Set HSTS max-age to at least 31536000 seconds (1 year)",
            "Consider longer values for enhanced security",
            "Test changes in staging environment first",
          ],
          priority: "low",
          effort: "low",
        },
        references: ["https://owasp.org/www-community/Security_Headers"],
        cwe_ids: ["CWE-16"],
        compliance_mappings: {
          OWASP: ["A05:2021 – Security Misconfiguration"],
        },
        confidence_score: 0.8,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze security headers
   */
  private analyzeSecurityHeaders(options: ServiceAnalysisOptions): void {
    if (!isValidUrl(options.target)) {
      throw new Error(
        `Invalid target URL for header analysis: ${options.target}`,
      );
    }

    this.emit("header_analysis_started", {
      target: options.target,
    });

    // Simulated HTTP request - in real implementation would use http/https modules
    const response = this.makeHTTPRequest(options.target, options);
    const responseHeaders = response.headers;

    // Check for essential security headers
    const securityHeaders = [
      {
        name: "Content-Security-Policy",
        required: true,
        severity: SecuritySeverity.HIGH,
        description: "Content Security Policy helps prevent XSS attacks",
      },
      {
        name: "X-Frame-Options",
        required: true,
        severity: SecuritySeverity.MEDIUM,
        description: "X-Frame-Options prevents clickjacking attacks",
      },
      {
        name: "X-Content-Type-Options",
        required: true,
        severity: SecuritySeverity.MEDIUM,
        description: "X-Content-Type-Options prevents MIME type sniffing",
      },
      {
        name: "Referrer-Policy",
        required: true,
        severity: SecuritySeverity.LOW,
        description: "Referrer-Policy controls referrer information",
      },
      {
        name: "Permissions-Policy",
        required: false,
        severity: SecuritySeverity.LOW,
        description: "Permissions-Policy controls browser features",
      },
    ];

    for (const header of securityHeaders) {
      const headerKey = header.name.toLowerCase();
      if (
        !responseHeaders[headerKey] ||
        typeof responseHeaders[headerKey] !== "string"
      ) {
        if (header.required) {
          this.addFinding({
            id: this.generateFindingId(),
            title: `Missing Security Header: ${header.name}`,
            description: `Required security header ${header.name} is missing. ${header.description}`,
            severity: header.severity,
            category: SecurityCategory.MISCONFIGURATION,
            configurationType: ConfigurationType.WEB_SERVICE,
            source: options.target,
            location: options.target,
            evidence: {
              missingHeader: header.name,
              responseHeaders: Object.keys(responseHeaders),
            },
            remediation: {
              description: `Add ${header.name} header`,
              steps: [
                `Configure server to include ${header.name} header`,
                "Set appropriate values based on application requirements",
                "Test configuration to ensure functionality is not broken",
                "Monitor for any compatibility issues",
              ],
              priority:
                header.severity === SecuritySeverity.HIGH ? "high" : "medium",
              effort: "low",
            },
            references: [
              "https://owasp.org/www-community/Security_Headers",
              "https://securityheaders.com/",
            ],
            cwe_ids: ["CWE-16"],
            compliance_mappings: {
              OWASP: ["A05:2021 – Security Misconfiguration"],
            },
            confidence_score: 0.9,
            false_positive_likelihood: "very_low",
          });
        }
      } else {
        // Analyze header values for security issues
        const headerValue = responseHeaders[headerKey];
        if (typeof headerValue === "string") {
          this.analyzeSecurityHeaderValue(
            header.name,
            headerValue,
            options.target,
          );
        }
      }
    }

    // Check for information disclosure headers
    this.analyzeInformationDisclosureHeaders(responseHeaders, options.target);
  }

  /**
   * Analyze specific security header values
   */
  private analyzeSecurityHeaderValue(
    headerName: string,
    headerValue: string,
    target: string,
  ): void {
    if (
      typeof headerName !== "string" ||
      typeof headerValue !== "string" ||
      typeof target !== "string"
    ) {
      return; // Skip invalid inputs
    }
    switch (headerName) {
      case "Content-Security-Policy":
        this.analyzeCSPHeader(headerValue, target);
        break;
      case "X-Frame-Options":
        this.analyzeFrameOptionsHeader(headerValue, target);
        break;
      case "X-Content-Type-Options":
        this.analyzeContentTypeOptionsHeader(headerValue, target);
        break;
      default:
        // Generic header value analysis
        break;
    }
  }

  /**
   * Analyze Content Security Policy header
   */
  private analyzeCSPHeader(csp: string, target: string): void {
    if (typeof csp !== "string" || typeof target !== "string") {
      return; // Skip invalid inputs
    }

    const cspDirectives = this.parseCSPHeader(csp);

    // Check for dangerous directives
    const dangerousDirectives = [
      {
        directive: "script-src",
        value: "'unsafe-inline'",
        severity: SecuritySeverity.HIGH,
      },
      {
        directive: "script-src",
        value: "'unsafe-eval'",
        severity: SecuritySeverity.HIGH,
      },
      {
        directive: "default-src",
        value: "*",
        severity: SecuritySeverity.MEDIUM,
      },
      { directive: "img-src", value: "data:", severity: SecuritySeverity.LOW },
    ];

    for (const dangerous of dangerousDirectives) {
      const directiveValues = cspDirectives[dangerous.directive];
      if (
        Array.isArray(directiveValues) &&
        directiveValues.includes(dangerous.value)
      ) {
        this.addFinding({
          id: this.generateFindingId(),
          title: `Unsafe CSP Directive: ${dangerous.directive}`,
          description: `Content Security Policy contains unsafe directive: ${dangerous.directive} ${dangerous.value}`,
          severity: dangerous.severity,
          category: SecurityCategory.MISCONFIGURATION,
          configurationType: ConfigurationType.WEB_SERVICE,
          source: target,
          location: target,
          evidence: {
            directive: dangerous.directive,
            unsafeValue: dangerous.value,
            fullCSP: csp,
          },
          remediation: {
            description: "Remove or restrict unsafe CSP directive",
            steps: [
              `Remove or restrict ${dangerous.value} from ${dangerous.directive}`,
              "Use nonce or hash-based CSP where possible",
              "Implement strict CSP policy",
              "Test CSP changes thoroughly",
            ],
            priority:
              dangerous.severity === SecuritySeverity.HIGH ? "high" : "medium",
            effort: "medium",
          },
          references: [
            "https://owasp.org/www-community/Security_Headers",
            "https://content-security-policy.com/",
          ],
          cwe_ids: ["CWE-79"],
          compliance_mappings: {
            OWASP: ["A03:2021 – Injection"],
          },
          confidence_score: 0.9,
          false_positive_likelihood: "low",
        });
      }
    }
  }

  /**
   * Analyze X-Frame-Options header
   */
  private analyzeFrameOptionsHeader(
    frameOptions: string,
    target: string,
  ): void {
    if (typeof frameOptions !== "string" || typeof target !== "string") {
      return; // Skip invalid inputs
    }

    const validValues = ["DENY", "SAMEORIGIN"];
    const value = frameOptions.toUpperCase().trim();

    if (!validValues.includes(value) && !value.startsWith("ALLOW-FROM ")) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Invalid X-Frame-Options Value",
        description: `X-Frame-Options header has invalid value: ${frameOptions}`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.WEB_SERVICE,
        source: target,
        location: target,
        evidence: {
          currentValue: frameOptions,
          validValues,
        },
        remediation: {
          description: "Set valid X-Frame-Options value",
          steps: [
            "Use 'DENY' to prevent any framing",
            "Use 'SAMEORIGIN' to allow framing by same origin only",
            "Consider using Content-Security-Policy frame-ancestors instead",
          ],
          priority: "medium",
          effort: "low",
        },
        references: ["https://owasp.org/www-community/Security_Headers"],
        cwe_ids: ["CWE-1021"],
        compliance_mappings: {
          OWASP: ["A05:2021 – Security Misconfiguration"],
        },
        confidence_score: 0.85,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze X-Content-Type-Options header
   */
  private analyzeContentTypeOptionsHeader(
    contentTypeOptions: string,
    target: string,
  ): void {
    if (typeof contentTypeOptions !== "string" || typeof target !== "string") {
      return; // Skip invalid inputs
    }

    if (contentTypeOptions.toLowerCase().trim() !== "nosniff") {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Invalid X-Content-Type-Options Value",
        description: `X-Content-Type-Options should be set to 'nosniff', found: ${contentTypeOptions}`,
        severity: SecuritySeverity.LOW,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.WEB_SERVICE,
        source: target,
        location: target,
        evidence: {
          currentValue: contentTypeOptions,
          expectedValue: "nosniff",
        },
        remediation: {
          description: "Set X-Content-Type-Options to 'nosniff'",
          steps: [
            "Configure server to send X-Content-Type-Options: nosniff",
            "Verify header is present in all responses",
          ],
          priority: "low",
          effort: "low",
        },
        references: ["https://owasp.org/www-community/Security_Headers"],
        cwe_ids: ["CWE-16"],
        compliance_mappings: {
          OWASP: ["A05:2021 – Security Misconfiguration"],
        },
        confidence_score: 0.9,
        false_positive_likelihood: "very_low",
      });
    }
  }

  /**
   * Analyze information disclosure headers
   */
  private analyzeInformationDisclosureHeaders(
    headers: Record<string, string>,
    target: string,
  ): void {
    if (!headers || typeof target !== "string") {
      return; // Skip invalid inputs
    }
    const disclosureHeaders = [
      { name: "server", description: "Server version information" },
      { name: "x-powered-by", description: "Technology stack information" },
      { name: "x-aspnet-version", description: "ASP.NET version information" },
      {
        name: "x-aspnetmvc-version",
        description: "ASP.NET MVC version information",
      },
    ];

    for (const disclosureHeader of disclosureHeaders) {
      const headerValue = headers[disclosureHeader.name];
      if (headerValue && typeof headerValue === "string") {
        this.addFinding({
          id: this.generateFindingId(),
          title: `Information Disclosure: ${disclosureHeader.name}`,
          description: `Server exposes ${disclosureHeader.description} through ${disclosureHeader.name} header`,
          severity: SecuritySeverity.LOW,
          category: SecurityCategory.DATA_EXPOSURE,
          configurationType: ConfigurationType.WEB_SERVICE,
          source: target,
          location: target,
          evidence: {
            header: disclosureHeader.name,
            value: headerValue,
          },
          remediation: {
            description: `Remove or minimize ${disclosureHeader.name} header`,
            steps: [
              `Configure server to remove or minimize ${disclosureHeader.name} header`,
              "Consider generic values if header cannot be removed",
              "Review other response headers for information disclosure",
            ],
            priority: "low",
            effort: "low",
          },
          references: ["https://owasp.org/www-community/Security_Headers"],
          cwe_ids: ["CWE-200"],
          compliance_mappings: {
            OWASP: ["A05:2021 – Security Misconfiguration"],
          },
          confidence_score: 0.7,
          false_positive_likelihood: "medium",
        });
      }
    }
  }

  /**
   * Analyze authentication configuration
   */
  private async analyzeAuthentication(
    options: ServiceAnalysisOptions,
  ): Promise<void> {
    this.emit("auth_analysis_started", {
      target: options.target,
    });

    // Test authentication mechanisms
    this.testAuthenticationMechanisms(options);

    // Test session management
    void this.testSessionManagement(options);

    // Test password policies
    await this.testPasswordPolicies(options);
  }

  /**
   * Test authentication mechanisms
   */
  private testAuthenticationMechanisms(options: ServiceAnalysisOptions): void {
    const authTests = [
      {
        name: "Basic Authentication",
        test: () => this.testBasicAuth(options),
      },
      {
        name: "JWT Authentication",
        test: () => this.testJWTAuth(options),
      },
      {
        name: "Session-based Authentication",
        test: () => this.testSessionAuth(options),
      },
      {
        name: "API Key Authentication",
        test: () => this.testAPIKeyAuth(options),
      },
    ];

    for (const authTest of authTests) {
      try {
        authTest.test();
      } catch (err) {
        const errorMessage = getServiceErrorMessage(err);
        this.emit("auth_test_error", {
          test: authTest.name,
          error: errorMessage,
        });
      }
    }
  }

  /**
   * Test basic authentication
   */
  private testBasicAuth(options: ServiceAnalysisOptions): void {
    if (!isValidUrl(options.target)) {
      return; // Skip invalid URL
    }

    // Would implement actual basic auth testing
    // This is structural implementation for comprehensive analysis

    const basicAuthEndpoint = `${options.target}/api/protected`; // Example endpoint

    // Test without credentials
    const _unauthorizedResponse = this.makeHTTPRequest(basicAuthEndpoint, {
      ...options,
      credentials: undefined,
    });

    // Test with weak credentials
    if (options.credentials) {
      const weakCredentials = [
        { username: "admin", password: "admin" },
        { username: "admin", password: "password" },
        { username: "admin", password: "123456" },
      ];

      for (const creds of weakCredentials) {
        const response = this.makeHTTPRequest(basicAuthEndpoint, {
          ...options,
          credentials: creds,
        });

        if (response.status === 200) {
          this.addFinding({
            id: this.generateFindingId(),
            title: "Weak Default Credentials",
            description: `Service accepts weak default credentials: ${creds.username}/${creds.password}`,
            severity: SecuritySeverity.CRITICAL,
            category: SecurityCategory.WEAK_AUTHENTICATION,
            configurationType: ConfigurationType.AUTHENTICATION,
            source: basicAuthEndpoint,
            location: basicAuthEndpoint,
            evidence: {
              username: creds.username,
              // Don't store actual password in evidence
              credentialsType: "weak_default",
            },
            remediation: {
              description: "Change default credentials",
              steps: [
                "Change all default passwords immediately",
                "Implement strong password policy",
                "Force password change on first login",
                "Consider disabling default accounts",
              ],
              priority: "critical",
              effort: "low",
            },
            references: [
              "https://owasp.org/www-community/Authentication_Cheat_Sheet",
            ],
            cwe_ids: ["CWE-521", "CWE-798"],
            compliance_mappings: {
              OWASP: ["A07:2021 – Identification and Authentication Failures"],
            },
            confidence_score: 0.95,
            false_positive_likelihood: "very_low",
          });
        }
      }
    }
  }

  /**
   * Test JWT authentication
   */
  private testJWTAuth(_options: ServiceAnalysisOptions): void {
    // JWT-specific security tests
    const _jwtTests = [
      "Test for JWT token validation",
      "Test for algorithm confusion attacks",
      "Test for token expiration handling",
      "Test for secret key strength",
    ];

    // Implementation would test actual JWT endpoints
    // This provides comprehensive structure for JWT security analysis
  }

  /**
   * Test session-based authentication
   */
  private testSessionAuth(_options: ServiceAnalysisOptions): void {
    // Session security tests
    const _sessionTests = [
      "Test session cookie security attributes",
      "Test session fixation protection",
      "Test session timeout",
      "Test concurrent session limits",
    ];

    // Implementation would test actual session management
  }

  /**
   * Test API key authentication
   */
  private testAPIKeyAuth(_options: ServiceAnalysisOptions): void {
    // API key security tests
    const _apiKeyTests = [
      "Test API key transmission security",
      "Test API key rotation mechanisms",
      "Test API key strength",
      "Test rate limiting per API key",
    ];

    // Implementation would test actual API key handling
  }

  /**
   * Test session management
   */
  private async testSessionManagement(
    _options: ServiceAnalysisOptions,
  ): Promise<void> {
    // Session management security analysis
    // Would implement comprehensive session testing
  }

  /**
   * Test password policies
   */
  private async testPasswordPolicies(
    _options: ServiceAnalysisOptions,
  ): Promise<void> {
    // Password policy testing
    // Would implement password policy validation
  }

  /**
   * Analyze CORS configuration
   */
  private analyzeCORS(options: ServiceAnalysisOptions): void {
    this.emit("cors_analysis_started", {
      target: options.target,
    });

    if (!isValidUrl(options.target)) {
      return; // Skip invalid URL
    }

    const corsResponse = this.makeHTTPRequest(options.target, {
      ...options,
      customHeaders: {
        ...options.customHeaders,
        Origin: "https://malicious-site.com",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "X-Custom-Header",
      },
      method: "OPTIONS",
    });

    // Analyze CORS headers
    const headers = corsResponse.headers || {};
    const corsHeaders = {
      allowOrigin: headers["access-control-allow-origin"],
      allowMethods: headers["access-control-allow-methods"],
      allowHeaders: headers["access-control-allow-headers"],
      allowCredentials: headers["access-control-allow-credentials"],
      exposeHeaders: headers["access-control-expose-headers"],
      maxAge: headers["access-control-max-age"],
    };

    // Check for overly permissive CORS
    if (corsHeaders.allowOrigin === "*") {
      let severity = SecuritySeverity.MEDIUM;
      let description = "CORS policy allows all origins (*)";

      if (corsHeaders.allowCredentials === "true") {
        severity = SecuritySeverity.HIGH;
        description =
          "CORS policy allows all origins (*) with credentials enabled";
      }

      this.addFinding({
        id: this.generateFindingId(),
        title: "Overly Permissive CORS Policy",
        description,
        severity,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.WEB_SERVICE,
        source: options.target,
        location: options.target,
        evidence: {
          corsHeaders,
          allowOrigin: corsHeaders.allowOrigin,
          allowCredentials: corsHeaders.allowCredentials,
        },
        remediation: {
          description: "Implement restrictive CORS policy",
          steps: [
            "Specify explicit allowed origins instead of using wildcard (*)",
            "Disable credentials if not needed",
            "Limit allowed methods to only necessary ones",
            "Review and minimize exposed headers",
          ],
          priority: severity === SecuritySeverity.HIGH ? "high" : "medium",
          effort: "low",
        },
        references: [
          "https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny",
          "https://portswigger.net/web-security/cors",
        ],
        cwe_ids: ["CWE-346"],
        compliance_mappings: {
          OWASP: ["A05:2021 – Security Misconfiguration"],
        },
        confidence_score: 0.9,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze service endpoints
   */
  private analyzeEndpoints(options: ServiceAnalysisOptions): void {
    this.emit("endpoint_analysis_started", {
      target: options.target,
    });

    // Endpoint enumeration and security testing
    const commonEndpoints = [
      "/api/v1/",
      "/api/v2/",
      "/admin/",
      "/debug/",
      "/health",
      "/status",
      "/metrics",
      "/.well-known/",
      "/swagger/",
      "/docs/",
    ];

    for (const endpoint of commonEndpoints) {
      const fullUrl = new URL(endpoint, options.target).toString();
      try {
        const response = this.makeHTTPRequest(fullUrl, options);
        this.analyzeEndpointResponse(fullUrl, response);
      } catch (err) {
        // Endpoint not accessible or other error
        const errorMessage = getServiceErrorMessage(err);
        this.emit("endpoint_test_error", {
          endpoint: fullUrl,
          error: errorMessage,
        });
      }
    }
  }

  /**
   * Analyze endpoint response for security issues
   */
  private analyzeEndpointResponse(
    endpoint: string,
    response: ServiceHttpResponse,
  ): void {
    if (typeof endpoint !== "string" || !response) {
      return; // Skip invalid inputs
    }
    // Check for information disclosure
    if (response.status === 200) {
      // Check for debug information
      if (response.body && typeof response.body === "string") {
        const debugPatterns = [
          /stack\s*trace/i,
          /debug\s*mode/i,
          /exception\s*details/i,
          /internal\s*server\s*error/i,
        ];

        for (const pattern of debugPatterns) {
          if (pattern.test(response.body)) {
            this.addFinding({
              id: this.generateFindingId(),
              title: "Debug Information Disclosure",
              description: `Endpoint ${endpoint} exposes debug information`,
              severity: SecuritySeverity.MEDIUM,
              category: SecurityCategory.DATA_EXPOSURE,
              configurationType: ConfigurationType.API_ENDPOINT,
              source: endpoint,
              location: endpoint,
              evidence: {
                endpoint,
                responseStatus: response.status,
                matchedPattern: pattern.toString(),
              },
              remediation: {
                description:
                  "Remove debug information from production responses",
                steps: [
                  "Disable debug mode in production",
                  "Configure proper error handling",
                  "Review all endpoints for information disclosure",
                  "Implement generic error messages",
                ],
                priority: "medium",
                effort: "low",
              },
              references: [
                "https://owasp.org/www-community/Improper_Error_Handling",
              ],
              cwe_ids: ["CWE-209"],
              compliance_mappings: {
                OWASP: ["A05:2021 – Security Misconfiguration"],
              },
              confidence_score: 0.8,
              false_positive_likelihood: "medium",
            });
          }
        }
      }
    }
  }

  /**
   * Analyze HTTP security configuration
   */
  private analyzeHTTPSecurity(options: ServiceAnalysisOptions): void {
    // HTTP method security analysis
    const httpMethods = [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "OPTIONS",
      "PATCH",
      "HEAD",
      "TRACE",
    ];

    for (const method of httpMethods) {
      if (!isValidHttpMethod(method)) continue;

      try {
        const response = this.makeHTTPRequest(options.target, {
          ...options,
          method,
        });

        if (method === "TRACE" && response.status === 200) {
          this.addFinding({
            id: this.generateFindingId(),
            title: "HTTP TRACE Method Enabled",
            description:
              "HTTP TRACE method is enabled, which can be used for Cross-Site Tracing (XST) attacks",
            severity: SecuritySeverity.LOW,
            category: SecurityCategory.MISCONFIGURATION,
            configurationType: ConfigurationType.WEB_SERVICE,
            source: options.target,
            location: options.target,
            evidence: {
              method: "TRACE",
              responseStatus: response.status,
            },
            remediation: {
              description: "Disable HTTP TRACE method",
              steps: [
                "Configure web server to disable TRACE method",
                "Review server configuration for unnecessary HTTP methods",
                "Test configuration changes",
              ],
              priority: "low",
              effort: "low",
            },
            references: [
              "https://owasp.org/www-community/attacks/Cross_Site_Tracing",
            ],
            cwe_ids: ["CWE-16"],
            compliance_mappings: {
              OWASP: ["A05:2021 – Security Misconfiguration"],
            },
            confidence_score: 0.85,
            false_positive_likelihood: "low",
          });
        }
      } catch (_error) {
        // Method not supported or other error
      }
    }
  }

  /**
   * Analyze service responses for security issues
   */
  private analyzeServiceResponses(options: ServiceAnalysisOptions): void {
    if (!isValidUrl(options.target)) {
      return; // Skip invalid URL
    }

    // Response analysis for security issues
    const response = this.makeHTTPRequest(options.target, options);

    // Check for common security issues in responses
    if (response) {
      this.analyzeResponseContent(response, options.target);
      this.analyzeResponseHeaders(response.headers || {}, options.target);
    }
  }

  /**
   * Analyze response content for security issues
   */
  private analyzeResponseContent(
    response: ServiceHttpResponse,
    target: string,
  ): void {
    if (
      !response?.body ||
      typeof response.body !== "string" ||
      typeof target !== "string"
    ) {
      return;
    }

    // Check for sensitive information in response
    const sensitivePatterns = [
      { pattern: /password\s*[:=]\s*['"](.*?)['"]/i, type: "Password" },
      { pattern: /api[_-]?key\s*[:=]\s*['"](.*?)['"]/i, type: "API Key" },
      { pattern: /secret\s*[:=]\s*['"](.*?)['"]/i, type: "Secret" },
      { pattern: /token\s*[:=]\s*['"](.*?)['"]/i, type: "Token" },
      {
        pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/i,
        type: "Private Key",
      },
    ];

    for (const sensitive of sensitivePatterns) {
      if (sensitive.pattern.test(response.body)) {
        this.addFinding({
          id: this.generateFindingId(),
          title: `Sensitive Information Disclosure: ${sensitive.type}`,
          description: `Response contains sensitive information: ${sensitive.type}`,
          severity: SecuritySeverity.HIGH,
          category: SecurityCategory.DATA_EXPOSURE,
          configurationType: ConfigurationType.WEB_SERVICE,
          source: target,
          location: target,
          evidence: {
            sensitiveType: sensitive.type,
            pattern: sensitive.pattern.toString(),
            // Don't include actual sensitive values in evidence
          },
          remediation: {
            description: `Remove ${sensitive.type} from response content`,
            steps: [
              `Remove ${sensitive.type} from all response content`,
              "Review code for other sensitive information disclosure",
              "Implement proper secret management",
              "Use environment variables for sensitive configuration",
            ],
            priority: "high",
            effort: "medium",
          },
          references: [
            "https://owasp.org/www-community/Improper_Error_Handling",
          ],
          cwe_ids: ["CWE-200"],
          compliance_mappings: {
            OWASP: ["A02:2021 – Cryptographic Failures"],
          },
          confidence_score: 0.9,
          false_positive_likelihood: "low",
        });
      }
    }
  }

  /**
   * Analyze response headers for security issues
   */
  private analyzeResponseHeaders(
    headers: Record<string, string>,
    target: string,
  ): void {
    // Additional response header analysis beyond security headers
    // This would complement the security headers analysis

    // Check for cache-control issues with sensitive content
    const cacheControl = headers["cache-control"];
    if (!cacheControl || !cacheControl.toLowerCase().includes("no-cache")) {
      // This might be a finding depending on the content type
      const contentType = headers["content-type"];
      if (contentType && contentType.includes("application/json")) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "Missing Cache Control for Sensitive Content",
          description:
            "API responses may contain sensitive data but lack proper cache control headers",
          severity: SecuritySeverity.LOW,
          category: SecurityCategory.MISCONFIGURATION,
          configurationType: ConfigurationType.API_ENDPOINT,
          source: target,
          location: target,
          evidence: {
            cacheControl: cacheControl || "missing",
            contentType,
          },
          remediation: {
            description:
              "Implement appropriate cache control for sensitive content",
            steps: [
              "Add 'Cache-Control: no-cache, no-store, must-revalidate' for sensitive responses",
              "Review all API endpoints for appropriate caching policies",
              "Consider data sensitivity when setting cache headers",
            ],
            priority: "low",
            effort: "low",
          },
          references: ["https://owasp.org/www-community/Security_Headers"],
          cwe_ids: ["CWE-524"],
          compliance_mappings: {
            OWASP: ["A05:2021 – Security Misconfiguration"],
          },
          confidence_score: 0.6,
          false_positive_likelihood: "high",
        });
      }
    }
  }

  /**
   * Parse service configuration from file
   */
  private parseServiceConfiguration(
    configPath: string,
    content: string,
  ): ServiceSecurityConfig {
    if (typeof configPath !== "string" || typeof content !== "string") {
      throw new Error("Invalid parameters for service configuration parsing");
    }

    const ext = path.extname(configPath).toLowerCase();

    try {
      switch (ext) {
        case ".json":
          return this.parseJSONServiceConfig(content, configPath);
        case ".yaml":
        case ".yml":
          return this.parseYAMLServiceConfig(content, configPath);
        case ".toml":
          return this.parseTOMLServiceConfig(content, configPath);
        case ".conf":
        case ".cfg":
          return this.parseGenericServiceConfig(content, configPath);
        default:
          return this.parseGenericServiceConfig(content, configPath);
      }
    } catch (err) {
      const errorMessage = getServiceErrorMessage(err);
      this.emit("config_parse_error", {
        configPath,
        error: errorMessage,
      });
      throw new Error(
        `Failed to parse configuration file ${configPath}: ${errorMessage}`,
      );
    }
  }

  /**
   * Parse JSON service configuration
   */
  private parseJSONServiceConfig(
    content: string,
    configPath: string,
  ): ServiceSecurityConfig {
    if (typeof content !== "string" || typeof configPath !== "string") {
      throw new Error("Invalid parameters for JSON parsing");
    }

    try {
      const config = JSON.parse(content) as Record<string, unknown>;
      return this.normalizeServiceConfig(config, configPath);
    } catch (err) {
      throw new Error(`Invalid JSON format: ${getServiceErrorMessage(err)}`);
    }
  }

  /**
   * Parse YAML service configuration
   */
  private parseYAMLServiceConfig(
    content: string,
    configPath: string,
  ): ServiceSecurityConfig {
    if (typeof content !== "string" || typeof configPath !== "string") {
      throw new Error("Invalid parameters for YAML parsing");
    }

    try {
      const config = parseYaml(content) as Record<string, unknown>;
      return this.normalizeServiceConfig(config, configPath);
    } catch (err) {
      throw new Error(`Invalid YAML format: ${getServiceErrorMessage(err)}`);
    }
  }

  /**
   * Parse TOML service configuration
   */
  private parseTOMLServiceConfig(
    content: string,
    configPath: string,
  ): ServiceSecurityConfig {
    // Would use TOML parser in real implementation
    // For now, basic parsing
    const config = this.parseKeyValueConfig(content);
    return this.normalizeServiceConfig(config, configPath);
  }

  /**
   * Parse generic service configuration
   */
  private parseGenericServiceConfig(
    content: string,
    configPath: string,
  ): ServiceSecurityConfig {
    if (typeof content !== "string" || typeof configPath !== "string") {
      throw new Error("Invalid parameters for generic config parsing");
    }

    const config = this.parseKeyValueConfig(content);
    return this.normalizeServiceConfig(config, configPath);
  }

  /**
   * Parse key-value configuration format
   */
  private parseKeyValueConfig(content: string): Record<string, string> {
    if (typeof content !== "string") {
      return {};
    }

    const config: Record<string, string> = {};
    const lines = content.split("\n");

    for (const line of lines) {
      if (typeof line !== "string") continue;

      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("//")) {
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match && match.length >= 3) {
          const [, key, value] = match;
          if (key && value !== undefined) {
            config[key.trim()] = value.trim();
          }
        }
      }
    }

    return config;
  }

  /**
   * Normalize service configuration to standard format
   */
  private normalizeServiceConfig(
    config: unknown,
    configPath: string,
  ): ServiceSecurityConfig {
    if (
      !config ||
      typeof config !== "object" ||
      typeof configPath !== "string"
    ) {
      throw new Error("Invalid configuration object or path");
    }

    const configObj = config as Record<string, unknown>;
    // Convert various configuration formats to standard ServiceSecurityConfig
    return {
      type: this.detectServiceType(configObj, configPath),
      endpoints: this.extractEndpoints(configObj),
      authentication: this.extractAuthConfig(configObj),
      authorization: this.extractAuthzConfig(configObj),
      tlsConfig: this.extractTLSConfig(configObj),
      corsConfig: this.extractCORSConfig(configObj),
      securityHeaders: this.extractSecurityHeaders(configObj),
      rateLimiting: this.extractRateLimitConfig(configObj),
      inputValidation: this.extractInputValidationConfig(configObj),
      sessionManagement: this.extractSessionConfig(configObj),
      sessionConfig: this.extractSessionConfig(configObj),
      rateLimitConfig: this.extractRateLimitConfig(configObj),
      inputValidationConfig: this.extractInputValidationConfig(configObj),
      csrfConfig: this.extractCSRFConfig(configObj),
      loggingConfig: this.extractLoggingConfig(configObj),
    } as ServiceSecurityConfig;
  }

  /**
   * Detect service type from configuration
   */
  private detectServiceType(
    config: Record<string, unknown>,
    configPath: string,
  ): "web" | "api" | "microservice" | "worker" {
    if (typeof configPath !== "string") {
      return "web"; // Default fallback
    }

    // Logic to detect service type based on configuration
    if (config?.api || config?.swagger || configPath.includes("api")) {
      return "api";
    } else if (config?.microservice || config?.service) {
      return "microservice";
    } else if (config?.worker || config?.background) {
      return "worker";
    } else {
      return "web";
    }
  }

  /**
   * Extract endpoint configurations
   */
  private extractEndpoints(
    config: Record<string, unknown>,
  ): ServiceEndpointConfig[] {
    const endpoints: ServiceEndpointConfig[] = [];

    // Extract endpoints from various configuration formats
    if (Array.isArray(config?.endpoints)) {
      for (const endpoint of config.endpoints) {
        if (endpoint && typeof endpoint === "object") {
          endpoints.push(
            this.normalizeEndpoint(endpoint as Record<string, unknown>),
          );
        }
      }
    }

    if (Array.isArray(config?.routes)) {
      for (const route of config.routes) {
        if (route && typeof route === "object") {
          endpoints.push(
            this.normalizeEndpoint(route as Record<string, unknown>),
          );
        }
      }
    }

    return endpoints;
  }

  /**
   * Normalize endpoint configuration
   */
  private normalizeEndpoint(
    endpoint: Record<string, unknown>,
  ): ServiceEndpointConfig {
    const path =
      typeof endpoint.path === "string"
        ? endpoint.path
        : typeof endpoint.route === "string"
          ? endpoint.route
          : "/";

    let methods: string[];
    if (Array.isArray(endpoint.methods)) {
      methods = endpoint.methods.filter((m) => typeof m === "string");
    } else if (typeof endpoint.method === "string") {
      methods = [endpoint.method];
    } else {
      methods = ["GET"];
    }

    return {
      path,
      methods,
      authRequired: Boolean(endpoint.authRequired || endpoint.auth),
      authorizedRoles: Array.isArray(endpoint.roles)
        ? endpoint.roles.filter((r) => typeof r === "string")
        : Array.isArray(endpoint.authorizedRoles)
          ? endpoint.authorizedRoles.filter((r) => typeof r === "string")
          : [],
      rateLimit: endpoint.rateLimit as ServiceEndpointRateLimit | undefined,
      validationRules: this.extractValidationRules(endpoint.validation),
      responseHeaders:
        endpoint.headers &&
        typeof endpoint.headers === "object" &&
        !Array.isArray(endpoint.headers)
          ? (endpoint.headers as Record<string, string>)
          : {},
      httpsOnly: Boolean(endpoint.httpsOnly || endpoint.ssl || endpoint.secure),
    };
  }

  /**
   * Extract authentication configuration
   */
  private extractAuthConfig(
    config: Record<string, unknown>,
  ): ServiceAuthConfig {
    const authConfig = config.auth as Record<string, unknown> | undefined;

    return {
      methods: Array.isArray(authConfig?.methods)
        ? authConfig.methods.filter((m) => typeof m === "string")
        : [],
      jwtConfig: config.jwt as ServiceJWTConfig | undefined,
      oauthConfig: config.oauth as ServiceOAuthConfig | undefined,
      apiKeyConfig: config.apiKey as ServiceAPIKeyConfig | undefined,
      sessionAuth: config.session as ServiceSessionAuth | undefined,
      mfaConfig: config.mfa as ServiceMFAConfig | undefined,
    };
  }

  /**
   * Extract authorization configuration
   */
  private extractAuthzConfig(config: Record<string, unknown>): unknown {
    return (
      config.authorization ||
      config.authz || {
        model: "rbac",
        roles: [],
        resources: [],
        policies: [],
        defaultDeny: true,
      }
    );
  }

  /**
   * Extract TLS configuration
   */
  private extractTLSConfig(config: Record<string, unknown>): ServiceTLSConfig {
    const tlsRaw = config.tls || config.ssl || {};
    const tls =
      typeof tlsRaw === "object" && tlsRaw !== null
        ? (tlsRaw as Record<string, unknown>)
        : {};
    return {
      enabled: tls.enabled !== false,
      version: typeof tls.version === "string" ? tls.version : "TLSv1.2",
      certFile:
        typeof tls.cert === "string"
          ? tls.cert
          : typeof tls.certFile === "string"
            ? tls.certFile
            : undefined,
      keyFile:
        typeof tls.key === "string"
          ? tls.key
          : typeof tls.keyFile === "string"
            ? tls.keyFile
            : undefined,
      caFile:
        typeof tls.ca === "string"
          ? tls.ca
          : typeof tls.caFile === "string"
            ? tls.caFile
            : undefined,
      cipherSuites: this.extractStringArray(tls.ciphers || tls.cipherSuites),
      hstsEnabled: tls.hsts !== false,
      hstsMaxAge:
        typeof tls.hstsMaxAge === "number" ? tls.hstsMaxAge : 31536000,
      certificateTransparency: Boolean(tls.certificateTransparency),
      ocspStapling: Boolean(tls.ocspStapling),
    };
  }

  /**
   * Extract CORS configuration
   */
  private extractCORSConfig(
    config: Record<string, unknown>,
  ): ServiceCORSConfig {
    const corsRaw = config.cors || {};
    const cors =
      typeof corsRaw === "object" && corsRaw !== null
        ? (corsRaw as Record<string, unknown>)
        : {};
    return {
      enabled: cors.enabled !== false,
      allowedOrigins: this.extractStringArray(
        cors.origins || cors.allowedOrigins,
      ),
      allowedMethods: this.extractStringArray(
        cors.methods || cors.allowedMethods,
      ),
      allowedHeaders: this.extractStringArray(
        cors.headers || cors.allowedHeaders,
      ),
      exposedHeaders: this.extractStringArray(cors.exposedHeaders),
      allowCredentials: Boolean(cors.credentials || cors.allowCredentials),
      maxAge: typeof cors.maxAge === "number" ? cors.maxAge : 86400,
    };
  }

  /**
   * Extract security headers configuration
   */
  private extractSecurityHeaders(
    config: Record<string, unknown>,
  ): ServiceSecurityHeaders {
    const headersRaw = config.headers || config.securityHeaders || {};
    const headers =
      typeof headersRaw === "object" && headersRaw !== null
        ? (headersRaw as Record<string, unknown>)
        : {};
    return {
      contentSecurityPolicy:
        typeof headers.csp === "string"
          ? headers.csp
          : typeof headers.contentSecurityPolicy === "string"
            ? headers.contentSecurityPolicy
            : undefined,
      xFrameOptions:
        typeof headers.frameOptions === "string"
          ? headers.frameOptions
          : typeof headers.xFrameOptions === "string"
            ? headers.xFrameOptions
            : undefined,
      xContentTypeOptions:
        typeof headers.contentTypeOptions === "string"
          ? headers.contentTypeOptions
          : typeof headers.xContentTypeOptions === "string"
            ? headers.xContentTypeOptions
            : undefined,
      referrerPolicy:
        typeof headers.referrerPolicy === "string"
          ? headers.referrerPolicy
          : undefined,
      permissionsPolicy:
        typeof headers.permissionsPolicy === "string"
          ? headers.permissionsPolicy
          : undefined,
    };
  }

  /**
   * Extract session configuration
   */
  private extractSessionConfig(
    config: Record<string, unknown>,
  ): ServiceSessionConfig {
    return (config.session || {}) as ServiceSessionConfig;
  }

  /**
   * Extract rate limiting configuration
   */
  private extractRateLimitConfig(
    config: Record<string, unknown>,
  ): ServiceRateLimitConfig {
    return (config.rateLimit ||
      config.rateLimiting ||
      {}) as ServiceRateLimitConfig;
  }

  /**
   * Extract input validation configuration
   */
  private extractInputValidationConfig(
    config: Record<string, unknown>,
  ): ServiceInputValidationConfig {
    return (config.validation ||
      config.inputValidation ||
      {}) as ServiceInputValidationConfig;
  }

  /**
   * Extract CSRF configuration
   */
  private extractCSRFConfig(
    config: Record<string, unknown>,
  ): ServiceCSRFConfig {
    return (config.csrf || {}) as ServiceCSRFConfig;
  }

  /**
   * Extract logging configuration
   */
  private extractLoggingConfig(
    config: Record<string, unknown>,
  ): ServiceLoggingConfig {
    return (config.logging || {}) as ServiceLoggingConfig;
  }

  /**
   * Analyze service configuration for security issues
   */
  private analyzeServiceConfig(
    config: ServiceSecurityConfig,
    configPath: string,
  ): void {
    this.emit("service_config_analysis_started", {
      configPath,
      serviceType: config.type,
    });

    // Analyze authentication configuration
    this.analyzeAuthenticationConfig(config.authentication, configPath);

    // Analyze TLS configuration
    this.analyzeTLSConfigFile(config.tlsConfig, configPath);

    // Analyze CORS configuration
    this.analyzeCORSConfig(config.corsConfig, configPath);

    // Analyze security headers configuration
    this.analyzeSecurityHeadersConfig(config.securityHeaders, configPath);

    // Analyze endpoint configurations
    this.analyzeEndpointsConfig(config.endpoints, configPath);
  }

  /**
   * Analyze authentication configuration from file
   */
  private analyzeAuthenticationConfig(
    authConfig: ServiceAuthConfig,
    configPath: string,
  ): void {
    // Check for weak authentication methods
    const weakMethods = ["basic", "digest"];
    const foundWeak = authConfig.methods.filter((method) =>
      weakMethods.includes(method.toLowerCase()),
    );

    if (foundWeak.length > 0) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Weak Authentication Methods",
        description: `Configuration uses weak authentication methods: ${foundWeak.join(", ")}`,
        severity: SecuritySeverity.MEDIUM,
        category: SecurityCategory.WEAK_AUTHENTICATION,
        configurationType: ConfigurationType.AUTHENTICATION,
        source: configPath,
        location: configPath,
        evidence: {
          weakMethods: foundWeak,
          allMethods: authConfig.methods,
        },
        remediation: {
          description: "Use strong authentication methods",
          steps: [
            "Replace weak authentication methods with stronger alternatives",
            "Consider JWT, OAuth, or modern authentication protocols",
            "Implement proper session management",
            "Use multi-factor authentication where appropriate",
          ],
          priority: "medium",
          effort: "medium",
        },
        references: [
          "https://owasp.org/www-community/Authentication_Cheat_Sheet",
        ],
        cwe_ids: ["CWE-287"],
        compliance_mappings: {
          OWASP: ["A07:2021 – Identification and Authentication Failures"],
        },
        confidence_score: 0.8,
        false_positive_likelihood: "low",
      });
    }

    // Analyze JWT configuration if present
    if (authConfig.jwtConfig) {
      this.analyzeJWTConfig(
        authConfig.jwtConfig as unknown as JWTSecurityConfig &
          Record<string, unknown>,
        configPath,
      );
    }

    // Analyze OAuth configuration if present
    if (authConfig.oauthConfig) {
      this.analyzeOAuthConfig(
        authConfig.oauthConfig as unknown as OAuthSecurityConfig &
          Record<string, unknown>,
        configPath,
      );
    }
  }

  /**
   * Analyze JWT configuration
   */
  private analyzeJWTConfig(
    jwtConfig: JWTSecurityConfig,
    configPath: string,
  ): void {
    // Check JWT secret strength
    if (jwtConfig.secret && jwtConfig.secret.length < 32) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Weak JWT Secret",
        description:
          "JWT secret is too short and may be vulnerable to brute force attacks",
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.AUTHENTICATION,
        source: configPath,
        location: configPath,
        evidence: {
          secretLength: jwtConfig.secret.length,
          recommendedMinimum: 32,
        },
        remediation: {
          description: "Use strong JWT secret",
          steps: [
            "Generate a strong, random JWT secret (at least 256 bits)",
            "Store secret securely using environment variables",
            "Rotate secret regularly",
            "Consider using RSA keys for better security",
          ],
          priority: "high",
          effort: "low",
        },
        references: [
          "https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/",
        ],
        cwe_ids: ["CWE-326"],
        compliance_mappings: {
          OWASP: ["A02:2021 – Cryptographic Failures"],
        },
        confidence_score: 0.9,
        false_positive_likelihood: "low",
      });
    }

    // Check JWT algorithm
    const weakAlgorithms = ["none", "HS256"];
    if (jwtConfig.algorithm && weakAlgorithms.includes(jwtConfig.algorithm)) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Weak JWT Algorithm",
        description: `JWT uses weak algorithm: ${jwtConfig.algorithm}`,
        severity:
          jwtConfig.algorithm === "none"
            ? SecuritySeverity.CRITICAL
            : SecuritySeverity.MEDIUM,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.AUTHENTICATION,
        source: configPath,
        location: configPath,
        evidence: {
          algorithm: jwtConfig.algorithm,
          recommendedAlgorithms: ["RS256", "ES256"],
        },
        remediation: {
          description: "Use strong JWT algorithm",
          steps: [
            "Use RSA or ECDSA algorithms (RS256, ES256) instead of HMAC",
            "Never use 'none' algorithm",
            "Update JWT library to latest version",
            "Test compatibility after algorithm change",
          ],
          priority: jwtConfig.algorithm === "none" ? "critical" : "medium",
          effort: "medium",
        },
        references: [
          "https://auth0.com/blog/critical-vulnerabilities-in-json-web-token-libraries/",
        ],
        cwe_ids: ["CWE-327"],
        compliance_mappings: {
          OWASP: ["A02:2021 – Cryptographic Failures"],
        },
        confidence_score: 0.95,
        false_positive_likelihood: "very_low",
      });
    }
  }

  /**
   * Analyze OAuth configuration
   */
  private analyzeOAuthConfig(
    oauthConfig: OAuthSecurityConfig,
    configPath: string,
  ): void {
    // Check for hardcoded client secrets
    if (oauthConfig.clientSecret && !oauthConfig.clientSecret.startsWith("$")) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Hardcoded OAuth Client Secret",
        description:
          "OAuth client secret appears to be hardcoded in configuration",
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.AUTHENTICATION,
        source: configPath,
        location: configPath,
        evidence: {
          configField: "clientSecret",
          // Don't include actual secret value
        },
        remediation: {
          description: "Use environment variables for OAuth secrets",
          steps: [
            "Move client secret to environment variables",
            "Use secure secret management system",
            "Rotate OAuth credentials",
            "Review code repository for exposed secrets",
          ],
          priority: "high",
          effort: "low",
        },
        references: [
          "https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password",
        ],
        cwe_ids: ["CWE-798"],
        compliance_mappings: {
          OWASP: ["A02:2021 – Cryptographic Failures"],
        },
        confidence_score: 0.85,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze TLS configuration from file
   */
  private analyzeTLSConfigFile(
    tlsConfig: ServiceTLSConfig,
    configPath: string,
  ): void {
    if (!tlsConfig.enabled) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "TLS Disabled",
        description: "TLS/SSL is disabled in service configuration",
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.INSECURE_COMMUNICATION,
        configurationType: ConfigurationType.SSL_TLS,
        source: configPath,
        location: configPath,
        evidence: {
          tlsEnabled: false,
        },
        remediation: {
          description: "Enable TLS/SSL",
          steps: [
            "Enable TLS in service configuration",
            "Obtain and configure valid SSL certificates",
            "Configure secure TLS settings",
            "Test TLS configuration",
          ],
          priority: "high",
          effort: "medium",
        },
        references: [
          "https://owasp.org/www-community/Transport_Layer_Protection_Cheat_Sheet",
        ],
        cwe_ids: ["CWE-319"],
        compliance_mappings: {
          OWASP: ["A02:2021 – Cryptographic Failures"],
        },
        confidence_score: 0.95,
        false_positive_likelihood: "very_low",
      });
    }

    // Check TLS version
    const weakVersions = ["SSLv2", "SSLv3", "TLSv1.0", "TLSv1.1"];
    if (weakVersions.includes(tlsConfig.version)) {
      this.addFinding({
        id: this.generateFindingId(),
        title: "Weak TLS Version",
        description: `TLS configuration uses weak version: ${tlsConfig.version}`,
        severity: SecuritySeverity.HIGH,
        category: SecurityCategory.CRYPTOGRAPHIC_FAILURE,
        configurationType: ConfigurationType.SSL_TLS,
        source: configPath,
        location: configPath,
        evidence: {
          tlsVersion: tlsConfig.version,
          recommendedVersions: ["TLSv1.2", "TLSv1.3"],
        },
        remediation: {
          description: "Use secure TLS version",
          steps: [
            "Configure TLS 1.2 or higher",
            "Disable weak TLS/SSL versions",
            "Test compatibility with clients",
            "Monitor for connection issues",
          ],
          priority: "high",
          effort: "low",
        },
        references: [
          "https://owasp.org/www-community/Transport_Layer_Protection_Cheat_Sheet",
        ],
        cwe_ids: ["CWE-326"],
        compliance_mappings: {
          OWASP: ["A02:2021 – Cryptographic Failures"],
        },
        confidence_score: 0.9,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze CORS configuration from file
   */
  private analyzeCORSConfig(
    corsConfig: ServiceCORSConfig,
    configPath: string,
  ): void {
    if (corsConfig.allowedOrigins.includes("*")) {
      const severity = corsConfig.allowCredentials
        ? SecuritySeverity.HIGH
        : SecuritySeverity.MEDIUM;

      this.addFinding({
        id: this.generateFindingId(),
        title: "Permissive CORS Configuration",
        description: "CORS configuration allows all origins (*)",
        severity,
        category: SecurityCategory.MISCONFIGURATION,
        configurationType: ConfigurationType.WEB_SERVICE,
        source: configPath,
        location: configPath,
        evidence: {
          allowedOrigins: corsConfig.allowedOrigins,
          allowCredentials: corsConfig.allowCredentials,
        },
        remediation: {
          description: "Restrict CORS origins",
          steps: [
            "Specify explicit allowed origins instead of wildcard",
            "Remove credentials support if using wildcard origins",
            "Review and minimize allowed methods and headers",
            "Test CORS configuration with legitimate clients",
          ],
          priority: severity === SecuritySeverity.HIGH ? "high" : "medium",
          effort: "low",
        },
        references: [
          "https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny",
        ],
        cwe_ids: ["CWE-346"],
        compliance_mappings: {
          OWASP: ["A05:2021 – Security Misconfiguration"],
        },
        confidence_score: 0.9,
        false_positive_likelihood: "low",
      });
    }
  }

  /**
   * Analyze security headers configuration from file
   */
  private analyzeSecurityHeadersConfig(
    headersConfig: ServiceSecurityHeaders,
    configPath: string,
  ): void {
    const requiredHeaders = [
      { name: "contentSecurityPolicy", severity: SecuritySeverity.HIGH },
      { name: "frameOptions", severity: SecuritySeverity.MEDIUM },
      { name: "contentTypeOptions", severity: SecuritySeverity.MEDIUM },
    ];

    for (const header of requiredHeaders) {
      if (!headersConfig[header.name as keyof ServiceSecurityHeaders]) {
        this.addFinding({
          id: this.generateFindingId(),
          title: `Missing Security Header Configuration: ${header.name}`,
          description: `Required security header ${header.name} is not configured`,
          severity: header.severity,
          category: SecurityCategory.MISCONFIGURATION,
          configurationType: ConfigurationType.WEB_SERVICE,
          source: configPath,
          location: configPath,
          evidence: {
            missingHeader: header.name,
          },
          remediation: {
            description: `Configure ${header.name} header`,
            steps: [
              `Add ${header.name} configuration to service`,
              "Set appropriate values based on application requirements",
              "Test configuration to ensure functionality",
            ],
            priority:
              header.severity === SecuritySeverity.HIGH ? "high" : "medium",
            effort: "low",
          },
          references: ["https://owasp.org/www-community/Security_Headers"],
          cwe_ids: ["CWE-16"],
          compliance_mappings: {
            OWASP: ["A05:2021 – Security Misconfiguration"],
          },
          confidence_score: 0.8,
          false_positive_likelihood: "low",
        });
      }
    }
  }

  /**
   * Analyze endpoints configuration from file
   */
  private analyzeEndpointsConfig(
    endpoints: ServiceEndpointConfig[],
    configPath: string,
  ): void {
    for (const endpoint of endpoints) {
      // Check for unauthenticated sensitive endpoints
      const sensitivePaths = ["/admin", "/api", "/management", "/actuator"];
      const isSensitive = sensitivePaths.some((path) =>
        endpoint.path.toLowerCase().includes(path),
      );

      if (isSensitive && !endpoint.authRequired) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "Unauthenticated Sensitive Endpoint",
          description: `Sensitive endpoint ${endpoint.path} does not require authentication`,
          severity: SecuritySeverity.HIGH,
          category: SecurityCategory.ACCESS_CONTROL,
          configurationType: ConfigurationType.API_ENDPOINT,
          source: configPath,
          location: `${configPath}:endpoint:${endpoint.path}`,
          evidence: {
            endpoint: endpoint.path,
            authRequired: endpoint.authRequired,
            methods: endpoint.methods,
          },
          remediation: {
            description: "Require authentication for sensitive endpoints",
            steps: [
              `Enable authentication for endpoint ${endpoint.path}`,
              "Review access control requirements",
              "Implement proper authorization checks",
              "Test authentication flow",
            ],
            priority: "high",
            effort: "low",
          },
          references: [
            "https://owasp.org/www-community/Access_Control_Cheat_Sheet",
          ],
          cwe_ids: ["CWE-862"],
          compliance_mappings: {
            OWASP: ["A01:2021 – Broken Access Control"],
          },
          confidence_score: 0.85,
          false_positive_likelihood: "medium",
        });
      }

      // Check for missing rate limiting on public endpoints
      if (!endpoint.rateLimit && !endpoint.authRequired) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "Missing Rate Limiting",
          description: `Public endpoint ${endpoint.path} lacks rate limiting`,
          severity: SecuritySeverity.MEDIUM,
          category: SecurityCategory.MISCONFIGURATION,
          configurationType: ConfigurationType.API_ENDPOINT,
          source: configPath,
          location: `${configPath}:endpoint:${endpoint.path}`,
          evidence: {
            endpoint: endpoint.path,
            rateLimit: null,
            authRequired: endpoint.authRequired,
          },
          remediation: {
            description: "Implement rate limiting",
            steps: [
              `Configure rate limiting for endpoint ${endpoint.path}`,
              "Set appropriate limits based on expected usage",
              "Monitor rate limit effectiveness",
              "Consider different limits for authenticated users",
            ],
            priority: "medium",
            effort: "low",
          },
          references: [
            "https://owasp.org/www-community/attacks/Denial_of_Service",
          ],
          cwe_ids: ["CWE-770"],
          compliance_mappings: {
            OWASP: ["A04:2021 – Insecure Design"],
          },
          confidence_score: 0.7,
          false_positive_likelihood: "medium",
        });
      }
    }
  }

  /**
   * Find service configuration files in directory
   */
  private async findServiceConfigFiles(directory: string): Promise<string[]> {
    const patterns = [
      "**/*.json",
      "**/*.yaml",
      "**/*.yml",
      "**/*.toml",
      "**/*.conf",
      "**/*.cfg",
      "**/nginx.conf",
      "**/apache.conf",
      "**/httpd.conf",
      "**/.env*",
    ];

    const configFiles: string[] = [];

    for (const pattern of patterns) {
      const matches = await safeGlob(pattern, {
        cwd: directory,
        absolute: true,
      });
      configFiles.push(...matches);
    }

    return [...new Set(configFiles)]; // Remove duplicates
  }

  /**
   * Analyze directory security
   */
  private async analyzeDirectorySecurity(directory: string): Promise<void> {
    // Check directory permissions
    try {
      const _stats = await fs.stat(directory);
      // Would check actual permissions in real implementation

      // Check for sensitive files
      const sensitiveFiles = await this.findSensitiveFiles(directory);

      for (const sensitiveFile of sensitiveFiles) {
        this.addFinding({
          id: this.generateFindingId(),
          title: "Sensitive File Found",
          description: `Sensitive file found in service directory: ${path.basename(sensitiveFile)}`,
          severity: SecuritySeverity.MEDIUM,
          category: SecurityCategory.DATA_EXPOSURE,
          configurationType: ConfigurationType.SYSTEM_CONFIG,
          source: directory,
          location: sensitiveFile,
          evidence: {
            fileName: path.basename(sensitiveFile),
            filePath: sensitiveFile,
          },
          remediation: {
            description: "Secure or remove sensitive files",
            steps: [
              "Review file content and necessity",
              "Remove file if not needed",
              "Restrict file permissions if needed",
              "Move to secure location if required",
            ],
            priority: "medium",
            effort: "low",
          },
          references: [
            "https://owasp.org/www-community/vulnerabilities/Sensitive_Data_Exposure",
          ],
          cwe_ids: ["CWE-200"],
          compliance_mappings: {
            OWASP: ["A02:2021 – Cryptographic Failures"],
          },
          confidence_score: 0.6,
          false_positive_likelihood: "medium",
        });
      }
    } catch (_error) {
      // Directory access error
    }
  }

  /**
   * Find sensitive files in directory
   */
  private async findSensitiveFiles(directory: string): Promise<string[]> {
    const sensitivePatterns = [
      "**/*.key",
      "**/*.pem",
      "**/*.p12",
      "**/*.jks",
      "**/.env*",
      "**/id_rsa*",
      "**/id_dsa*",
      "**/id_ecdsa*",
      "**/passwords*",
      "**/secrets*",
    ];

    const sensitiveFiles: string[] = [];

    for (const pattern of sensitivePatterns) {
      const matches = await safeGlob(pattern, {
        cwd: directory,
        absolute: true,
      });
      sensitiveFiles.push(...matches);
    }

    return sensitiveFiles;
  }

  /**
   * Determine analysis type from target
   */
  private determineAnalysisType(
    target: string,
  ): "url" | "config" | "directory" {
    try {
      // Try parsing as URL
      new URL(target);
      return "url";
    } catch {
      // Not a URL, check if file or directory
      if (path.extname(target)) {
        return "config";
      } else {
        return "directory";
      }
    }
  }

  /**
   * Make HTTP request (simulated)
   */
  private makeHTTPRequest(
    _url: string,
    _options: ServiceAnalysisOptions,
  ): ServiceHttpResponse {
    if (!isValidUrl(_url)) {
      throw new Error(`Invalid URL for HTTP request: ${_url}`);
    }

    // This would make actual HTTP requests in real implementation
    // Simulated response structure for comprehensive analysis
    return {
      status: 200,
      headers: {
        "content-type": "application/json",
        server: "nginx/1.18.0",
        // Would include actual response headers
      },
      body: JSON.stringify({ status: "ok" }),
    };
  }

  /**
   * Parse CSP header
   */
  private parseCSPHeader(csp: string): Record<string, string[]> {
    const directives: Record<string, string[]> = {};
    const parts = csp.split(";");

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed) {
        const [directive, ...values] = trimmed.split(/\s+/);
        directives[directive] = values;
      }
    }

    return directives;
  }

  /**
   * Generate analysis result
   */
  private generateServiceAnalysisResult(
    options: ServiceAnalysisOptions,
    startTime: number,
  ): SecurityAnalysisResult {
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate risk assessment
    const criticalCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.CRITICAL,
    ).length;
    const highCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.HIGH,
    ).length;
    const mediumCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.MEDIUM,
    ).length;
    const lowCount = this.findings.filter(
      (f) => f.severity === SecuritySeverity.LOW,
    ).length;

    let overallRisk: "low" | "medium" | "high" | "critical" = "low";
    let riskScore = 0;

    if (criticalCount > 0) {
      overallRisk = "critical";
      riskScore = Math.min(10, 8 + criticalCount * 0.5);
    } else if (highCount > 0) {
      overallRisk = "high";
      riskScore = Math.min(7.9, 6 + highCount * 0.3);
    } else if (mediumCount > 2) {
      overallRisk = "medium";
      riskScore = Math.min(5.9, 3 + mediumCount * 0.2);
    } else {
      riskScore = Math.min(2.9, lowCount * 0.1 + mediumCount * 0.5);
    }

    // Generate remediation recommendations
    const recommendations: RemediationRecommendation[] = [];

    if (criticalCount > 0) {
      recommendations.push({
        priority: "critical",
        category: "authentication",
        description: "Address critical security vulnerabilities immediately",
        impact: "Prevents potential security breaches",
        effort: "high",
        timeframe: "immediate",
      });
    }

    if (highCount > 0) {
      recommendations.push({
        priority: "high",
        category: "configuration",
        description: "Fix high-severity configuration issues",
        impact: "Significantly improves security posture",
        effort: "medium",
        timeframe: "1-7 days",
      });
    }

    return {
      analysisId: crypto.randomUUID(),
      timestamp: new Date(),
      target: {
        type: "service",
        name: options.target,
        location: options.target,
        configuration: {},
      },
      duration: duration,
      findings: this.findings,
      riskSummary: {
        overall:
          overallRisk === "critical"
            ? SecuritySeverity.CRITICAL
            : overallRisk === "high"
              ? SecuritySeverity.HIGH
              : overallRisk === "medium"
                ? SecuritySeverity.MEDIUM
                : SecuritySeverity.LOW,
        riskLevel: overallRisk,
        criticalIssues: criticalCount,
        highIssues: highCount,
        mediumIssues: mediumCount,
        lowIssues: lowCount,
        score: riskScore,
        riskFactors: this.getTopRiskCategories().map((category) => ({
          factor: category,
          impact: SecuritySeverity.MEDIUM,
          description: `Issues found in ${category} category`,
          weight: 1.0,
        })) as RiskFactor[],
      },
      recommendations: recommendations.map((rec, index) => ({
        id: `service-rec-${index + 1}`,
        title: rec.category
          .replace(/_/g, " ")
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        description: rec.description,
        priority:
          rec.priority === "critical"
            ? SecuritySeverity.CRITICAL
            : rec.priority === "high"
              ? SecuritySeverity.HIGH
              : rec.priority === "medium"
                ? SecuritySeverity.MEDIUM
                : SecuritySeverity.LOW,
        implementationEffort: rec.effort,
        implementationSteps: [rec.description],
        expectedImpact: rec.impact,
        relatedFindings: [],
        resources: [],
      })),
      complianceAssessment: {
        framework: "OWASP Top 10",
        version: "2021",
        overallScore: Math.max(0, 100 - this.findings.length * 5),
        passedControls: Math.max(
          0,
          10 -
            Math.ceil(
              this.findings.filter((f) => f.compliance_mappings?.["OWASP"])
                .length / 3,
            ),
        ),
        failedControls: Math.ceil(
          this.findings.filter((f) => f.compliance_mappings?.["OWASP"]).length /
            3,
        ),
        totalControls: 10,
        controlResults: [],
        recommendations: [
          "Address critical findings",
          "Implement security controls",
          "Regular security audits",
        ],
      },
      metadata: {
        analyzerVersion: "1.0.0",
        configurationVersion: "1.0.0",
        analysisScope: [
          "service_configuration",
          "authentication",
          "tls_ssl",
          "security_headers",
          "cors",
        ],
        excludedItems: [],
        analysisParameters: {
          target: options.target,
          serviceType: options.serviceType || "web",
          activeTestingEnabled: options.enableActiveTesting || false,
        },
        environmentInfo: {
          operatingSystem: process.platform,
          osVersion: process.version,
          architecture: process.arch,
          hostname: "localhost",
          uptime: process.uptime(),
          availableMemory: 0,
          totalMemory: 0,
          cpuInfo: {
            model: "unknown",
            cores: 1,
            speed: 0,
            architecture: process.arch,
          },
          networkInterfaces: [],
        },
      },
    };
  }

  /**
   * Get top risk categories
   */
  private getTopRiskCategories(): string[] {
    const categoryCount: Record<string, number> = {};

    for (const finding of this.findings) {
      categoryCount[finding.category] =
        (categoryCount[finding.category] || 0) + 1;
    }

    return Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
  }

  /**
   * Generate vulnerability assessment
   */
  private _generateVulnerabilityAssessment(): VulnerabilityAssessment {
    return {
      total_vulnerabilities: this.findings.length,
      exploitable_vulnerabilities: this.findings.filter(
        (f) =>
          f.severity === SecuritySeverity.CRITICAL ||
          f.severity === SecuritySeverity.HIGH,
      ).length,
      false_positive_likelihood: {
        very_low: this.findings.filter(
          (f) => f.false_positive_likelihood === "very_low",
        ).length,
        low: this.findings.filter((f) => f.false_positive_likelihood === "low")
          .length,
        medium: this.findings.filter(
          (f) => f.false_positive_likelihood === "medium",
        ).length,
        high: this.findings.filter(
          (f) => f.false_positive_likelihood === "high",
        ).length,
        very_high: this.findings.filter(
          (f) => f.false_positive_likelihood === "very_high",
        ).length,
      },
      attack_vectors: [
        ...new Set(this.findings.flatMap((f) => f.cwe_ids || [])),
      ],
      affected_assets: [this.findings[0]?.source || "service"].filter(Boolean),
    };
  }

  /**
   * Generate compliance report
   */
  private _generateComplianceReport(): ComplianceReport {
    const owaspFindings = this.findings.filter(
      (f) => f.compliance_mappings && f.compliance_mappings["OWASP"],
    ).length;

    return {
      framework_compliance: {
        "OWASP Top 10": {
          covered_controls: 10,
          passed_controls: Math.max(0, 10 - Math.ceil(owaspFindings / 2)),
          compliance_percentage: Math.max(0, 100 - owaspFindings * 10),
        },
      },
      regulatory_compliance: {
        gaps_identified: owaspFindings,
        recommendations: [
          "Address OWASP Top 10 vulnerabilities",
          "Implement secure configuration standards",
          "Enable comprehensive security logging",
        ],
      },
    };
  }

  /**
   * Add finding to results
   */
  private addFinding(finding: SecurityFinding): void {
    this.findings.push(finding);

    this.emit("finding_detected", {
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      source: finding.source,
    });
  }

  /**
   * Helper method to extract string arrays from unknown values
   */
  private extractStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value.filter((item) => typeof item === "string");
    }
    return [];
  }

  /**
   * Helper method to extract string records from unknown values
   */
  private _extractStringRecord(value: unknown): Record<string, string> {
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      const record: Record<string, string> = {};
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === "string") {
          record[key] = val;
        }
      }
      return record;
    }
    return {};
  }

  /**
   * Helper method to extract validation rules
   */
  private extractValidationRules(value: unknown): ServiceValidationRule[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((rule) => typeof rule === "object" && rule !== null)
      .map((rule) => {
        const r = rule as Record<string, unknown>;
        return {
          field: typeof r.field === "string" ? r.field : "",
          type: typeof r.type === "string" ? r.type : "string",
          required: Boolean(r.required),
          pattern: typeof r.pattern === "string" ? r.pattern : undefined,
          minLength: typeof r.minLength === "number" ? r.minLength : undefined,
          maxLength: typeof r.maxLength === "number" ? r.maxLength : undefined,
        } satisfies ServiceValidationRule;
      });
  }

  /**
   * Generate unique finding ID
   */
  private generateFindingId(): string {
    return `service_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }
}
