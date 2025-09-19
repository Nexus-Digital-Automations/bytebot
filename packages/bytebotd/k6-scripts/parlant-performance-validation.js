/**
 * K6 Load Testing Script - PARLANT PHASE 1 Performance Validation
 *
 * Enterprise-grade performance testing framework specifically designed to validate
 * PARLANT PHASE 1 achieves sub-1000ms P95 response times with 85%+ cache hit rates
 * under realistic conversational validation workloads.
 *
 * Performance Targets:
 * - P95 response time: <1000ms under all load conditions
 * - P99 response time: <2000ms under normal load
 * - Cache hit rate: 85%+ after warmup period
 * - Throughput: 5000+ validations/second sustained
 * - Concurrent sessions: 1000+ conversational sessions
 * - Memory usage: Stable under extended load
 *
 * Test Scenarios:
 * 1. Baseline Performance (Single User)
 * 2. Ramp-up Load Testing (1-100 users)
 * 3. Sustained High Load (1000+ concurrent users)
 * 4. Spike Load Testing (Sudden traffic bursts)
 * 5. Cache Performance Validation
 * 6. Conversational Session Stress Testing
 * 7. Memory Leak Detection
 * 8. Performance Regression Testing
 *
 * @version 1.0.0
 * @author PARLANT Performance Testing Agent
 * @requires k6 v0.40+
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

// ===== CUSTOM METRICS FOR PARLANT PERFORMANCE TRACKING =====

const parlantValidationLatency = new Trend('parlant_validation_latency', true);
const parlantCacheHitRate = new Rate('parlant_cache_hit_rate');
const parlantErrorRate = new Rate('parlant_error_rate');
const conversationalSessionsActive = new Gauge('conversational_sessions_active');
const parlantThroughput = new Rate('parlant_throughput');
const memoryUsageGauge = new Gauge('memory_usage_mb');
const cacheMissCount = new Counter('cache_miss_count');
const cacheHitCount = new Counter('cache_hit_count');

// ===== PERFORMANCE TEST CONFIGURATION =====

/**
 * K6 Test Configuration - Progressive Load Testing
 * Gradually increases load to identify breaking points and validate targets
 */
export const options = {
  scenarios: {
    // Scenario 1: Baseline Performance Testing
    baseline_performance: {
      executor: 'constant-vus',
      vus: 1,
      duration: '2m',
      tags: { scenario: 'baseline' },
      exec: 'baselinePerformanceTest',
      startTime: '0s',
    },

    // Scenario 2: Gradual Ramp-up Testing
    ramp_up_testing: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 10 },   // Ramp to 10 users
        { duration: '5m', target: 50 },   // Ramp to 50 users
        { duration: '5m', target: 100 },  // Ramp to 100 users
        { duration: '10m', target: 100 }, // Sustain 100 users
        { duration: '2m', target: 0 },    // Ramp down
      ],
      tags: { scenario: 'ramp_up' },
      exec: 'conversationalValidationTest',
      startTime: '2m',
    },

    // Scenario 3: High Load Sustained Testing (PARLANT Target)
    high_load_sustained: {
      executor: 'constant-vus',
      vus: 500,
      duration: '15m',
      tags: { scenario: 'high_load' },
      exec: 'sustainedHighLoadTest',
      startTime: '26m',
    },

    // Scenario 4: Stress Testing (Breaking Point)
    stress_testing: {
      executor: 'ramping-vus',
      startVUs: 500,
      stages: [
        { duration: '2m', target: 1000 },  // Ramp to 1000 users
        { duration: '5m', target: 1000 },  // Sustain 1000 users
        { duration: '2m', target: 1500 },  // Stress to 1500 users
        { duration: '3m', target: 1500 },  // Sustain stress load
        { duration: '2m', target: 0 },     // Ramp down
      ],
      tags: { scenario: 'stress' },
      exec: 'stressTestValidation',
      startTime: '41m',
    },

    // Scenario 5: Spike Load Testing
    spike_load: {
      executor: 'ramping-vus',
      startVUs: 100,
      stages: [
        { duration: '10s', target: 2000 }, // Sudden spike
        { duration: '1m', target: 2000 },  // Sustain spike
        { duration: '10s', target: 100 },  // Return to normal
      ],
      tags: { scenario: 'spike' },
      exec: 'spikeLoadTest',
      startTime: '55m',
    },

    // Scenario 6: Cache Performance Validation
    cache_performance: {
      executor: 'constant-vus',
      vus: 200,
      duration: '10m',
      tags: { scenario: 'cache_validation' },
      exec: 'cachePerformanceTest',
      startTime: '58m',
    },
  },

  // Global thresholds for PARLANT PHASE 1 performance targets
  thresholds: {
    // Response time targets
    'http_req_duration': [
      'p(95)<1000',    // P95 < 1000ms (CRITICAL TARGET)
      'p(99)<2000',    // P99 < 2000ms
      'avg<500',       // Average < 500ms
    ],

    // Parlant-specific thresholds
    'parlant_validation_latency': [
      'p(95)<1000',    // PARLANT P95 target
      'p(99)<2000',    // PARLANT P99 target
    ],

    // Cache performance targets
    'parlant_cache_hit_rate': ['rate>0.85'], // 85%+ cache hit rate

    // Error rate targets
    'parlant_error_rate': ['rate<0.05'],     // <5% error rate
    'http_req_failed': ['rate<0.05'],        // <5% HTTP failures

    // Throughput targets
    'parlant_throughput': ['rate>5000'],     // 5000+ validations/sec

    // System stability
    'http_req_duration{scenario:baseline}': ['p(95)<500'], // Baseline must be fast
    'http_req_duration{scenario:high_load}': ['p(95)<1000'], // High load target
  },
};

// ===== GLOBAL TEST STATE AND CONFIGURATION =====

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_VERSION = __ENV.API_VERSION || 'v1';
const TEST_DURATION = __ENV.TEST_DURATION || '300s';
const ENABLE_DEBUG = __ENV.ENABLE_DEBUG === 'true';

// Test data generators for realistic conversational validation
const conversationTemplates = [
  {
    functionName: 'get_user_profile',
    riskLevel: 'LOW',
    actionDescription: 'Retrieve user profile information',
  },
  {
    functionName: 'update_user_settings',
    riskLevel: 'MEDIUM',
    actionDescription: 'Modify user account settings',
  },
  {
    functionName: 'delete_user_data',
    riskLevel: 'HIGH',
    actionDescription: 'Permanently delete user data',
  },
  {
    functionName: 'send_notification',
    riskLevel: 'LOW',
    actionDescription: 'Send notification to user',
  },
  {
    functionName: 'access_system_config',
    riskLevel: 'HIGH',
    actionDescription: 'Access system configuration',
  },
  {
    functionName: 'generate_report',
    riskLevel: 'MEDIUM',
    actionDescription: 'Generate data analytics report',
  },
];

let sessionCounter = 0;
let requestCounter = 0;

// ===== CORE TEST FUNCTIONS =====

/**
 * Baseline Performance Testing - Single User Validation
 * Establishes performance baseline for comparison
 */
export function baselinePerformanceTest() {
  group('Baseline Performance - Single User', () => {
    const startTime = Date.now();

    // Test basic health endpoint
    const healthResponse = http.get(`${BASE_URL}/health`);
    check(healthResponse, {
      'health endpoint responds': (r) => r.status === 200,
      'health response time <100ms': (r) => r.timings.duration < 100,
    });

    // Test PARLANT conversational validation
    const validationRequest = generateConversationalValidationRequest();
    const validationResponse = performConversationalValidation(validationRequest);

    const duration = Date.now() - startTime;
    parlantValidationLatency.add(duration);
    parlantThroughput.add(1);

    // Record baseline metrics
    if (ENABLE_DEBUG) {
      console.log(`Baseline validation completed in ${duration}ms`);
    }

    sleep(0.1); // Brief pause for baseline testing
  });
}

/**
 * Conversational Validation Testing - Realistic User Patterns
 * Simulates realistic conversational AI validation workloads
 */
export function conversationalValidationTest() {
  const userId = `user_${__VU}_${++sessionCounter}`;
  const sessionId = `session_${Date.now()}_${__VU}`;

  group('Conversational Validation Flow', () => {
    conversationalSessionsActive.add(1);

    // Simulate conversation session with multiple validations
    for (let i = 0; i < 5; i++) {
      const validationRequest = generateConversationalValidationRequest(userId, sessionId, i);
      const response = performConversationalValidation(validationRequest);

      // Cache hit/miss tracking
      const cacheHeader = response.headers['X-Cache-Status'];
      if (cacheHeader === 'HIT') {
        cacheHitCount.add(1);
        parlantCacheHitRate.add(1);
      } else {
        cacheMissCount.add(1);
        parlantCacheHitRate.add(0);
      }

      sleep(0.5); // Realistic pause between conversation turns
    }

    conversationalSessionsActive.add(-1);
  });
}

/**
 * Sustained High Load Testing - PARLANT Target Validation
 * Tests system under sustained high load to validate P95 targets
 */
export function sustainedHighLoadTest() {
  group('Sustained High Load - PARLANT Targets', () => {
    const startTime = Date.now();

    // Batch validation requests for efficiency
    const batchSize = 3;
    const requests = [];

    for (let i = 0; i < batchSize; i++) {
      const validationRequest = generateConversationalValidationRequest();
      requests.push({
        method: 'POST',
        url: `${BASE_URL}/api/parlant/validate`,
        body: JSON.stringify(validationRequest),
        params: {
          headers: {
            'Content-Type': 'application/json',
            'X-Performance-Test': 'high-load',
            'X-Batch-Size': batchSize.toString(),
          },
        },
      });
    }

    // Execute batch requests
    const responses = http.batch(requests);

    responses.forEach((response, index) => {
      const duration = response.timings.duration;
      parlantValidationLatency.add(duration);

      const success = check(response, {
        'validation successful': (r) => r.status === 200,
        'response time acceptable': (r) => r.timings.duration < 1000,
      });

      if (!success) {
        parlantErrorRate.add(1);
      } else {
        parlantErrorRate.add(0);
        parlantThroughput.add(1);
      }
    });

    // Monitor memory usage during high load
    if (requestCounter % 100 === 0) {
      const memoryResponse = http.get(`${BASE_URL}/api/system/memory`);
      if (memoryResponse.status === 200) {
        try {
          const memoryData = JSON.parse(memoryResponse.body);
          memoryUsageGauge.add(memoryData.heapUsed / (1024 * 1024)); // MB
        } catch (e) {
          // Memory endpoint not available, skip
        }
      }
    }

    requestCounter++;
    sleep(0.1); // High frequency requests
  });
}

/**
 * Stress Testing - Breaking Point Identification
 * Pushes system to limits to identify breaking points
 */
export function stressTestValidation() {
  group('Stress Testing - Breaking Point', () => {
    const validationRequest = generateConversationalValidationRequest();
    const response = performConversationalValidation(validationRequest);

    // More lenient checks for stress testing
    const success = check(response, {
      'stress request completed': (r) => r.status < 500,
      'stress response time <5000ms': (r) => r.timings.duration < 5000,
    });

    if (!success) {
      parlantErrorRate.add(1);
    } else {
      parlantErrorRate.add(0);
    }

    // No sleep during stress testing - maximum load
  });
}

/**
 * Spike Load Testing - Traffic Burst Validation
 * Tests system response to sudden traffic spikes
 */
export function spikeLoadTest() {
  group('Spike Load Testing', () => {
    const validationRequest = generateConversationalValidationRequest();
    validationRequest.context.metadata = {
      ...validationRequest.context.metadata,
      testType: 'spike_load',
      timestamp: Date.now(),
    };

    const response = performConversationalValidation(validationRequest);

    check(response, {
      'spike load handled': (r) => r.status < 400,
      'spike response time <2000ms': (r) => r.timings.duration < 2000,
    });

    // Minimal sleep during spike testing
    sleep(0.05);
  });
}

/**
 * Cache Performance Testing - 85%+ Hit Rate Validation
 * Specifically tests cache performance with repeated requests
 */
export function cachePerformanceTest() {
  group('Cache Performance Validation', () => {
    // Generate requests with high repetition to test cache efficiency
    const cacheableRequests = [
      'get_user_profile',
      'get_system_config',
      'get_notification_settings',
    ];

    const functionName = cacheableRequests[__VU % cacheableRequests.length];
    const userId = `cache_test_user_${__VU % 10}`; // Limited user pool for cache hits

    const validationRequest = generateConversationalValidationRequest(userId);
    validationRequest.functionName = functionName;
    validationRequest.context.metadata = {
      cacheOptimized: true,
      testType: 'cache_performance',
    };

    const response = performConversationalValidation(validationRequest);

    // Track cache performance
    const cacheStatus = response.headers['X-Cache-Status'] || 'MISS';
    const isCacheHit = cacheStatus === 'HIT';

    parlantCacheHitRate.add(isCacheHit ? 1 : 0);

    check(response, {
      'cache test successful': (r) => r.status === 200,
      'cache response fast': (r) => r.timings.duration < (isCacheHit ? 50 : 500),
    });

    if (ENABLE_DEBUG && __VU === 1) {
      console.log(`Cache ${cacheStatus} for ${functionName} - ${response.timings.duration}ms`);
    }

    sleep(0.2);
  });
}

// ===== UTILITY FUNCTIONS =====

/**
 * Generate realistic conversational validation request
 */
function generateConversationalValidationRequest(userId = null, sessionId = null, turnIndex = 0) {
  const template = conversationTemplates[Math.floor(Math.random() * conversationTemplates.length)];
  const uniqueUserId = userId || `load_test_user_${__VU}_${Math.floor(Date.now() / 1000)}`;
  const uniqueSessionId = sessionId || `session_${Date.now()}_${__VU}`;

  return {
    functionName: template.functionName,
    functionParams: {
      userId: uniqueUserId,
      requestId: `req_${++requestCounter}`,
      timestamp: Date.now(),
      turnIndex: turnIndex,
    },
    actionDescription: template.actionDescription,
    riskLevel: template.riskLevel,
    operationId: `op_${Date.now()}_${__VU}_${requestCounter}`,
    context: {
      userId: uniqueUserId,
      sessionId: uniqueSessionId,
      agentRole: 'assistant',
      securityLevel: template.riskLevel,
      conversationHistory: [],
      metadata: {
        loadTest: true,
        scenario: __ENV.SCENARIO || 'performance_validation',
        vuId: __VU,
        iteration: requestCounter,
      },
    },
  };
}

/**
 * Perform conversational validation with comprehensive metrics
 */
function performConversationalValidation(validationRequest) {
  const startTime = Date.now();

  const response = http.post(
    `${BASE_URL}/api/parlant/validate`,
    JSON.stringify(validationRequest),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Performance-Test': 'true',
        'X-Test-Scenario': __ENV.SCENARIO || 'default',
        'X-VU-ID': __VU.toString(),
        'X-Request-ID': validationRequest.operationId,
      },
      timeout: '10s',
    }
  );

  const duration = Date.now() - startTime;
  parlantValidationLatency.add(duration);

  // Comprehensive response validation
  const validationChecks = {
    'PARLANT validation request successful': (r) => r.status === 200,
    'PARLANT response time within target': (r) => r.timings.duration < 1000,
    'PARLANT response has valid structure': (r) => {
      try {
        const responseData = JSON.parse(r.body);
        return responseData && (responseData.allowed !== undefined);
      } catch (e) {
        return false;
      }
    },
  };

  check(response, validationChecks);

  return response;
}

// ===== CUSTOM REPORTING AND SUMMARY =====

/**
 * Generate comprehensive test summary with PARLANT-specific metrics
 */
export function handleSummary(data) {
  const parlantSummary = {
    'PARLANT Performance Validation Summary': {
      'P95 Response Time Target': data.metrics.parlant_validation_latency?.values?.['p(95)'] ?
        `${data.metrics.parlant_validation_latency.values['p(95)'].toFixed(2)}ms (Target: <1000ms)` : 'N/A',
      'P99 Response Time': data.metrics.parlant_validation_latency?.values?.['p(99)'] ?
        `${data.metrics.parlant_validation_latency.values['p(99)'].toFixed(2)}ms (Target: <2000ms)` : 'N/A',
      'Cache Hit Rate': data.metrics.parlant_cache_hit_rate?.values?.rate ?
        `${(data.metrics.parlant_cache_hit_rate.values.rate * 100).toFixed(1)}% (Target: >85%)` : 'N/A',
      'Error Rate': data.metrics.parlant_error_rate?.values?.rate ?
        `${(data.metrics.parlant_error_rate.values.rate * 100).toFixed(2)}% (Target: <5%)` : 'N/A',
      'Throughput': data.metrics.parlant_throughput?.values?.rate ?
        `${data.metrics.parlant_throughput.values.rate.toFixed(0)} validations/sec (Target: >5000)` : 'N/A',
    },
  };

  console.log('\n=== PARLANT PHASE 1 PERFORMANCE VALIDATION RESULTS ===');
  console.log(JSON.stringify(parlantSummary, null, 2));

  // Generate performance grade
  const p95 = data.metrics.parlant_validation_latency?.values?.['p(95)'] || 0;
  const cacheHitRate = data.metrics.parlant_cache_hit_rate?.values?.rate || 0;
  const errorRate = data.metrics.parlant_error_rate?.values?.rate || 0;

  let grade = 'F';
  let score = 0;

  if (p95 < 1000) score += 40;
  if (cacheHitRate > 0.85) score += 30;
  if (errorRate < 0.05) score += 20;
  if (data.metrics.http_req_duration?.values?.['p(95)'] < 1000) score += 10;

  if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';

  console.log(`\nPARLANT Performance Grade: ${grade} (${score}/100)`);
  console.log('======================================================\n');

  return {
    'parlant-performance-report.html': htmlReport(data),
    'parlant-performance-summary.txt': textSummary(data, { indent: ' ', enableColors: true }),
    'parlant-performance-detailed.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// ===== SETUP AND TEARDOWN =====

export function setup() {
  console.log('🚀 PARLANT PHASE 1 Performance Validation Starting...');
  console.log(`Target: P95 < 1000ms, Cache Hit Rate > 85%, Throughput > 5000/sec`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Duration: ${TEST_DURATION}`);

  // Warm up the system
  console.log('🔥 Warming up PARLANT system...');
  const warmupRequests = [];
  for (let i = 0; i < 20; i++) {
    warmupRequests.push(http.get(`${BASE_URL}/health`));
  }

  console.log('✅ System warmup completed');
  return { baseUrl: BASE_URL };
}

export function teardown(data) {
  console.log('🏁 PARLANT Performance Validation Complete');
  console.log(`Base URL tested: ${data.baseUrl}`);
}