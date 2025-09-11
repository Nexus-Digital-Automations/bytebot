/**
 * Real-Time Pattern Matcher Integration Examples
 *
 * Production-ready examples demonstrating how to integrate the real-time
 * pattern matching system with various security frameworks and applications.
 *
 * @fileoverview Pattern Matcher Integration Examples
 * @version 1.0.0
 * @author Integration Examples Specialist
 */

import {
  createRealTimePatternMatcher,
  createStreamingProcessor,
  type RealTimePatternMatcher,
  type PatternMatchConfig,
  type PatternMatchResult,
} from "../real-time-pattern-matcher";

// ===========================
// BASIC INTEGRATION EXAMPLE
// ===========================

/**
 * Basic integration example for web application security
 */
class WebApplicationSecurityIntegration {
  private readonly patternMatcher: RealTimePatternMatcher;

  constructor() {
    this.patternMatcher = createRealTimePatternMatcher({
      enableParallelProcessing: true,
      maxWorkers: 4,
      defaultProcessingMode: "async",
      confidenceAlgorithm: "weighted_average",
      maxProcessingTime: 500, // 500ms timeout for web requests
      enableCaching: true,
      cacheConfig: {
        maxSize: 5000,
        ttl: 300000, // 5 minutes
        algorithm: "lru",
        persistToDisk: false,
        compressionEnabled: false,
      },
      enableMetrics: true,
      metricsInterval: 10000, // 10 seconds
      alertThresholds: {
        highLatency: 200, // 200ms alert threshold
        lowThroughput: 100, // 100 requests per second minimum
        highErrorRate: 1, // 1% error rate alert
      },
    });

    // Set up event listeners for monitoring
    this.setupMonitoring();
  }

  /**
   * Validate user input in real-time
   */
  async validateUserInput(
    input: string,
    context: {
      userId?: string;
      sessionId?: string;
      endpoint?: string;
      method?: string;
      userAgent?: string;
      ipAddress?: string;
    },
  ): Promise<{
    isValid: boolean;
    threats: PatternMatchResult[];
    riskScore: number;
    recommendedAction: "allow" | "warn" | "block";
  }> {
    try {
      const results = await this.patternMatcher.matchPatterns(
        input,
        undefined,
        context,
      );

      // Calculate overall risk score
      const maxRiskScore = results.reduce(
        (max, result) => Math.max(max, result.riskScore),
        0,
      );

      // Determine recommended action
      let recommendedAction: "allow" | "warn" | "block" = "allow";

      if (maxRiskScore >= 80) {
        recommendedAction = "block";
      } else if (maxRiskScore >= 50) {
        recommendedAction = "warn";
      }

      // Filter for actual threats (matched patterns)
      const threats = results.filter((result) => result.matched);

      return {
        isValid: threats.length === 0,
        threats,
        riskScore: maxRiskScore,
        recommendedAction,
      };
    } catch (error) {
      // Log error and fail securely
      console.error("Pattern matching failed:", error);

      return {
        isValid: false,
        threats: [],
        riskScore: 100,
        recommendedAction: "block",
      };
    }
  }

  /**
   * Batch validate multiple inputs (e.g., form submission)
   */
  async validateBatch(
    inputs: Array<{ field: string; value: string }>,
    context: Record<string, unknown>,
  ): Promise<{
    overallValid: boolean;
    fieldResults: Record<
      string,
      {
        isValid: boolean;
        threats: PatternMatchResult[];
        riskScore: number;
      }
    >;
    recommendedAction: "allow" | "warn" | "block";
  }> {
    const inputValues = inputs.map((input) => input.value);
    const batchResult = await this.patternMatcher.processBatch(
      inputValues,
      undefined,
      context,
    );

    const fieldResults: Record<
      string,
      {
        isValid: boolean;
        threats: PatternMatchResult[];
        riskScore: number;
      }
    > = {};

    let overallMaxRisk = 0;
    let overallValid = true;

    // Process results for each field
    inputs.forEach((input, _index) => {
      const fieldThreats = batchResult.results.filter(
        (result) => result.processedLength === input.value.length,
      );

      const maxRisk = fieldThreats.reduce(
        (max, result) => Math.max(max, result.riskScore),
        0,
      );

      const isValid = fieldThreats.filter((t) => t.matched).length === 0;

      fieldResults[input.field] = {
        isValid,
        threats: fieldThreats.filter((t) => t.matched),
        riskScore: maxRisk,
      };

      if (!isValid) overallValid = false;
      if (maxRisk > overallMaxRisk) overallMaxRisk = maxRisk;
    });

    // Determine overall action
    let recommendedAction: "allow" | "warn" | "block" = "allow";

    if (overallMaxRisk >= 80) {
      recommendedAction = "block";
    } else if (overallMaxRisk >= 50) {
      recommendedAction = "warn";
    }

    return {
      overallValid,
      fieldResults,
      recommendedAction,
    };
  }

  /**
   * Register custom application-specific patterns
   */
  registerCustomPatterns(): void {
    // Application-specific XSS pattern
    const customXssPattern: PatternMatchConfig = {
      pattern: /<iframe[^>]*src\s*=\s*["'](?:javascript|data):/gi,
      type: "xss",
      name: "iframe_xss_custom",
      description: "Custom iframe-based XSS detection",
      baseSeverity: "high",
      baseConfidence: 0.9,
      weight: 1.3,
      maxExecutionTime: 100,
      cacheResults: true,
      enableParallel: true,
    };

    // Application-specific command injection
    const customCmdPattern: PatternMatchConfig = {
      pattern:
        /(?:exec|system|shell_exec|passthru|popen)\s*\(\s*\$_(?:GET|POST|REQUEST)/gi,
      type: "command_injection",
      name: "php_exec_custom",
      description: "Custom PHP execution with user input",
      baseSeverity: "critical",
      baseConfidence: 0.95,
      weight: 1.5,
      maxExecutionTime: 80,
      cacheResults: true,
      enableParallel: true,
    };

    this.patternMatcher.registerPattern(customXssPattern);
    this.patternMatcher.registerPattern(customCmdPattern);
  }

  /**
   * Set up monitoring and alerting
   */
  private setupMonitoring(): void {
    this.patternMatcher.on("alert", (alert) => {
      console.warn(`Security Alert - ${alert.type}:`, {
        value: alert.value,
        threshold: alert.threshold,
        timestamp: new Date(),
      });

      // In production, send to monitoring system
      // Example: sendToMonitoring('pattern_matcher_alert', alert);
    });

    this.patternMatcher.on("patterns_matched", (event) => {
      if (event.matchesFound > 0) {
        console.log("Security threats detected:", {
          inputLength: event.inputLength,
          patternsChecked: event.patternsChecked,
          matchesFound: event.matchesFound,
          processingTime: event.processingTime,
        });
      }
    });

    this.patternMatcher.on("matching_error", (error) => {
      console.error("Pattern matching error:", error);

      // In production, send to error tracking
      // Example: sendToErrorTracking(error);
    });
  }

  /**
   * Get security metrics for monitoring dashboard
   */
  getSecurityMetrics(): {
    performance: Record<string, unknown>;
    patterns: Record<string, unknown>;
  } {
    return {
      performance: this.patternMatcher.getMetrics(),
      patterns: this.patternMatcher.getPatternStats(),
    };
  }

  /**
   * Shutdown the security system
   */
  async shutdown(): Promise<void> {
    await this.patternMatcher.shutdown();
  }
}

// ===========================
// MIDDLEWARE INTEGRATION EXAMPLE
// ===========================

/**
 * Express.js middleware integration example
 */
class ExpressSecurityMiddleware {
  private readonly security: WebApplicationSecurityIntegration;

  constructor() {
    this.security = new WebApplicationSecurityIntegration();
    this.security.registerCustomPatterns();
  }

  /**
   * Create Express middleware for request validation
   */
  createMiddleware() {
    return async (
      req: {
        user?: { id: string };
        sessionID?: string;
        path: string;
        method: string;
        get: (_header: string) => string | undefined;
        ip?: string;
        connection?: { remoteAddress?: string };
        query?: Record<string, unknown>;
        body?: Record<string, unknown>;
      },
      res: {
        status: (_code: number) => {
          json: (_data: unknown) => void;
        };
      },
      next: () => void,
    ) => {
      try {
        const context = {
          userId: req.user?.id,
          sessionId: req.sessionID,
          endpoint: req.path,
          method: req.method,
          userAgent: req.get("User-Agent"),
          ipAddress: req.ip || req.connection?.remoteAddress,
        };

        // Validate query parameters
        if (req.query && Object.keys(req.query).length > 0) {
          const queryInputs = Object.entries(req.query).map(([key, value]) => ({
            field: `query.${key}`,
            value: String(value),
          }));

          const queryValidation = await this.security.validateBatch(
            queryInputs,
            { ...context, inputType: "query" },
          );

          if (queryValidation.recommendedAction === "block") {
            return res.status(400).json({
              error: "Malicious input detected in query parameters",
              blocked: true,
            });
          }

          if (queryValidation.recommendedAction === "warn") {
            console.warn("Suspicious query parameters detected:", {
              path: req.path,
              query: req.query,
              threats: queryValidation.fieldResults,
            });
          }
        }

        // Validate request body
        if (req.body && typeof req.body === "object") {
          const bodyInputs = this.flattenObject(req.body).map(
            ([key, value]) => ({
              field: `body.${key}`,
              value: String(value),
            }),
          );

          if (bodyInputs.length > 0) {
            const bodyValidation = await this.security.validateBatch(
              bodyInputs,
              { ...context, inputType: "body" },
            );

            if (bodyValidation.recommendedAction === "block") {
              return res.status(400).json({
                error: "Malicious input detected in request body",
                blocked: true,
              });
            }

            if (bodyValidation.recommendedAction === "warn") {
              console.warn("Suspicious request body detected:", {
                path: req.path,
                threats: bodyValidation.fieldResults,
              });
            }
          }
        }

        // Continue to next middleware
        next();
      } catch (error) {
        console.error("Security middleware error:", error);

        // Fail securely - block the request
        res.status(500).json({
          error: "Security validation failed",
          blocked: true,
        });
      }
    };
  }

  /**
   * Flatten nested object for validation
   */
  private flattenObject(
    obj: Record<string, unknown>,
    prefix = "",
  ): [string, unknown][] {
    const flattened: [string, unknown][] = [];

    Object.entries(obj).forEach(([key, value]) => {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (value && typeof value === "object" && !Array.isArray(value)) {
        flattened.push(
          ...this.flattenObject(value as Record<string, unknown>, fullKey),
        );
      } else {
        flattened.push([fullKey, value]);
      }
    });

    return flattened;
  }

  /**
   * Get middleware metrics
   */
  getMetrics() {
    return this.security.getSecurityMetrics();
  }

  /**
   * Shutdown middleware
   */
  async shutdown(): Promise<void> {
    await this.security.shutdown();
  }
}

// ===========================
// STREAMING INTEGRATION EXAMPLE
// ===========================

/**
 * Streaming data security analysis
 */
class StreamingSecurityAnalyzer {
  private readonly patternMatcher: RealTimePatternMatcher;
  private readonly streamingProcessor: ReturnType<
    typeof createStreamingProcessor
  >;
  private readonly threatBuffer: PatternMatchResult[] = [];

  constructor() {
    this.patternMatcher = createRealTimePatternMatcher({
      enableCaching: false, // Disable for streaming
      enableParallelProcessing: true,
      maxWorkers: 8,
      defaultProcessingMode: "streaming",
    });

    this.streamingProcessor = createStreamingProcessor(this.patternMatcher, {
      chunkSize: 64 * 1024, // 64KB chunks
      maxConcurrency: 16,
      backpressureThreshold: 1000,
      bufferSize: 10 * 1024 * 1024, // 10MB buffer
      enableMetrics: true,
    });

    this.setupStreamingListeners();
  }

  /**
   * Process streaming data (e.g., file uploads, real-time logs)
   */
  async processStreamingData(dataStream: NodeJS.ReadableStream): Promise<{
    totalProcessed: number;
    threatsDetected: number;
    highRiskThreats: PatternMatchResult[];
  }> {
    return new Promise((resolve, reject) => {
      let totalProcessed = 0;
      let threatsDetected = 0;
      const highRiskThreats: PatternMatchResult[] = [];

      dataStream.on("data", async (chunk: Buffer) => {
        try {
          totalProcessed += chunk.length;
          await this.streamingProcessor.processChunk(chunk);
        } catch (error) {
          console.error("Streaming processing error:", error);
          reject(error);
        }
      });

      dataStream.on("end", () => {
        // Process any remaining threats in buffer
        const highRisk = this.threatBuffer.filter(
          (threat) => threat.riskScore >= 70,
        );
        highRiskThreats.push(...highRisk);
        threatsDetected = this.threatBuffer.length;

        resolve({
          totalProcessed,
          threatsDetected,
          highRiskThreats,
        });

        // Clear buffer
        this.threatBuffer.length = 0;
      });

      dataStream.on("error", (error) => {
        console.error("Stream error:", error);
        reject(error);
      });
    });
  }

  /**
   * Set up streaming event listeners
   */
  private setupStreamingListeners(): void {
    this.streamingProcessor.on("matches_found", (event) => {
      // Add detected threats to buffer
      const threats = event.results.filter(
        (result: PatternMatchResult) => result.matched,
      );
      this.threatBuffer.push(...threats);

      // Log high-risk threats immediately
      const criticalThreats = threats.filter(
        (threat: PatternMatchResult) =>
          threat.severity === "critical" || threat.riskScore >= 90,
      );

      if (criticalThreats.length > 0) {
        console.error("Critical threats detected in stream:", {
          count: criticalThreats.length,
          threats: criticalThreats.map((t: PatternMatchResult) => ({
            type: t.patternType,
            severity: t.severity,
            riskScore: t.riskScore,
            confidence: t.confidence.score,
          })),
        });

        // In production, trigger immediate alerts
        // Example: triggerSecurityAlert(criticalThreats);
      }
    });

    this.streamingProcessor.on("backpressure", (event) => {
      console.warn("Streaming backpressure detected:", event);

      // In production, implement backpressure handling
      // Example: pauseStream() or increaseWorkers()
    });
  }

  /**
   * Shutdown streaming analyzer
   */
  async shutdown(): Promise<void> {
    await this.patternMatcher.shutdown();
  }
}

// ===========================
// API SECURITY INTEGRATION EXAMPLE
// ===========================

/**
 * API security integration with rate limiting and threat detection
 */
class APISecurityIntegration {
  private readonly patternMatcher: RealTimePatternMatcher;
  private readonly requestCounts = new Map<string, number>();
  private readonly threatCounts = new Map<string, number>();

  constructor() {
    this.patternMatcher = createRealTimePatternMatcher({
      enableParallelProcessing: true,
      maxWorkers: 6,
      defaultProcessingMode: "async",
      maxProcessingTime: 200, // Fast API response requirement
      enableCaching: true,
      cacheConfig: {
        maxSize: 10000,
        ttl: 600000, // 10 minutes
        algorithm: "lru",
        persistToDisk: false,
        compressionEnabled: true,
      },
    });

    // Clean up counters periodically
    setInterval(() => this.cleanupCounters(), 60000); // 1 minute
  }

  /**
   * Validate API request with rate limiting
   */
  async validateApiRequest(request: {
    path: string;
    method: string;
    headers: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
    clientId: string;
    ipAddress: string;
  }): Promise<{
    allowed: boolean;
    reason?: string;
    threats: PatternMatchResult[];
    riskScore: number;
    rateLimitStatus: {
      requests: number;
      threats: number;
      limitExceeded: boolean;
    };
  }> {
    const clientKey = `${request.clientId}:${request.ipAddress}`;

    // Check rate limits
    const requestCount = this.requestCounts.get(clientKey) || 0;
    const threatCount = this.threatCounts.get(clientKey) || 0;

    // Update request count
    this.requestCounts.set(clientKey, requestCount + 1);

    // Rate limit: 1000 requests per minute per client
    if (requestCount > 1000) {
      return {
        allowed: false,
        reason: "Rate limit exceeded",
        threats: [],
        riskScore: 0,
        rateLimitStatus: {
          requests: requestCount,
          threats: threatCount,
          limitExceeded: true,
        },
      };
    }

    // Collect all input data
    const inputs: string[] = [];

    // Add headers (selective)
    const suspiciousHeaders = ["user-agent", "referer", "x-forwarded-for"];
    suspiciousHeaders.forEach((header) => {
      if (request.headers[header]) {
        inputs.push(request.headers[header]);
      }
    });

    // Add query parameters
    if (request.query) {
      Object.values(request.query).forEach((value) => {
        if (typeof value === "string") inputs.push(value);
      });
    }

    // Add body data
    if (request.body) {
      if (typeof request.body === "string") {
        inputs.push(request.body);
      } else {
        inputs.push(JSON.stringify(request.body));
      }
    }

    // Process all inputs
    const batchResult = await this.patternMatcher.processBatch(
      inputs,
      undefined,
      {
        clientId: request.clientId,
        ipAddress: request.ipAddress,
        endpoint: request.path,
        method: request.method,
        apiSecurity: true,
      },
    );

    const threats = batchResult.results.filter((result) => result.matched);
    const maxRiskScore = threats.reduce(
      (max, result) => Math.max(max, result.riskScore),
      0,
    );

    // Update threat count if threats detected
    if (threats.length > 0) {
      this.threatCounts.set(clientKey, threatCount + threats.length);
    }

    // Block if high risk or repeated threats
    let allowed = true;
    let reason: string | undefined;

    if (maxRiskScore >= 80) {
      allowed = false;
      reason = "High-risk security threat detected";
    } else if (threatCount > 10) {
      // More than 10 threats in the time window
      allowed = false;
      reason = "Too many security threats from client";
    }

    return {
      allowed,
      reason,
      threats,
      riskScore: maxRiskScore,
      rateLimitStatus: {
        requests: requestCount,
        threats: threatCount + threats.length,
        limitExceeded: false,
      },
    };
  }

  /**
   * Clean up old counters
   */
  private cleanupCounters(): void {
    this.requestCounts.clear();
    this.threatCounts.clear();
  }

  /**
   * Get API security metrics
   */
  getApiMetrics(): {
    performance: Record<string, unknown>;
    patterns: Record<string, unknown>;
    activeSessions: number;
  } {
    return {
      performance: this.patternMatcher.getMetrics(),
      patterns: this.patternMatcher.getPatternStats(),
      activeSessions: this.requestCounts.size,
    };
  }

  /**
   * Shutdown API security
   */
  async shutdown(): Promise<void> {
    await this.patternMatcher.shutdown();
  }
}

// ===========================
// USAGE EXAMPLES
// ===========================

/**
 * Usage examples for different integration scenarios
 */
class PatternMatcherUsageExamples {
  /**
   * Example 1: Simple web form validation
   */
  static async simpleWebFormValidation() {
    const security = new WebApplicationSecurityIntegration();

    try {
      // Validate user registration form
      const result = await security.validateUserInput(
        '<script>alert("XSS")</script>',
        {
          userId: "user123",
          endpoint: "/register",
          method: "POST",
          ipAddress: "192.168.1.100",
        },
      );

      console.log("Validation result:", result);

      if (!result.isValid) {
        console.log("Security threats detected:", result.threats);
        console.log("Recommended action:", result.recommendedAction);
      }
    } finally {
      await security.shutdown();
    }
  }

  /**
   * Example 2: Express.js middleware usage
   */
  static async expressMiddlewareUsage() {
    const middleware = new ExpressSecurityMiddleware();

    // In your Express app:
    // app.use(middleware.createMiddleware());

    // Get metrics
    const metrics = middleware.getMetrics();
    console.log("Security metrics:", metrics);

    await middleware.shutdown();
  }

  /**
   * Example 3: Streaming file analysis
   */
  static async streamingFileAnalysis() {
    const analyzer = new StreamingSecurityAnalyzer();

    // Example: analyze uploaded file
    // const fileStream = fs.createReadStream('uploaded_file.txt');
    // const result = await analyzer.processStreamingData(fileStream);

    // console.log('File analysis result:', result);

    await analyzer.shutdown();
  }

  /**
   * Example 4: API security with rate limiting
   */
  static async apiSecurityExample() {
    const apiSecurity = new APISecurityIntegration();

    const request = {
      path: "/api/users",
      method: "GET",
      headers: {
        "user-agent": "Mozilla/5.0...",
        authorization: "Bearer token123",
      },
      query: {
        filter: "'; DROP TABLE users; --",
      },
      clientId: "client123",
      ipAddress: "192.168.1.100",
    };

    const result = await apiSecurity.validateApiRequest(request);
    console.log("API validation result:", result);

    if (!result.allowed) {
      console.log("Request blocked:", result.reason);
    }

    await apiSecurity.shutdown();
  }

  /**
   * Example 5: Custom pattern registration
   */
  static async customPatternExample() {
    const matcher = createRealTimePatternMatcher();

    // Register custom business logic pattern
    const customPattern: PatternMatchConfig = {
      pattern: /(?:admin|root|superuser)\s*=\s*true/gi,
      type: "custom",
      name: "privilege_escalation_attempt",
      description: "Detect privilege escalation attempts",
      baseSeverity: "high",
      baseConfidence: 0.85,
      weight: 1.2,
      maxExecutionTime: 100,
      cacheResults: true,
      enableParallel: true,
    };

    matcher.registerPattern(customPattern);

    // Test the custom pattern
    const result = await matcher.matchPatterns("user.admin = true", [
      "privilege_escalation_attempt",
    ]);

    console.log("Custom pattern result:", result);
    await matcher.shutdown();
  }
}

// Export all integration classes and examples
export {
  WebApplicationSecurityIntegration,
  ExpressSecurityMiddleware,
  StreamingSecurityAnalyzer,
  APISecurityIntegration,
  PatternMatcherUsageExamples,
};

// Export a default integration for simple usage
export default WebApplicationSecurityIntegration;
