"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const app_module_1 = require("../src/app.module");
const metrics_service_1 = require("../src/metrics/metrics.service");
const cache_service_1 = require("../src/cache/cache.service");
const performance_interceptor_1 = require("../src/common/interceptors/performance.interceptor");
const supertest_1 = __importDefault(require("supertest"));
describe('API Performance Benchmarks', () => {
    let app;
    let metricsService;
    let cacheService;
    let performanceInterceptor;
    const PERFORMANCE_TARGETS = {
        MAX_RESPONSE_TIME_P95: 200,
        MIN_THROUGHPUT: 1000,
        MIN_CACHE_HIT_RATE: 80,
        MAX_MEMORY_INCREASE: 100,
        MAX_CPU_UTILIZATION: 80,
    };
    const LOAD_TEST_CONFIG = {
        WARM_UP_REQUESTS: 100,
        BENCHMARK_REQUESTS: 1000,
        CONCURRENT_USERS: 50,
        TEST_DURATION: 60000,
    };
    beforeAll(async () => {
        const moduleFixture = await testing_1.Test.createTestingModule({
            imports: [app_module_1.AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        metricsService = moduleFixture.get(metrics_service_1.MetricsService);
        cacheService = moduleFixture.get(cache_service_1.CacheService);
        const interceptors = moduleFixture.get('APP_INTERCEPTOR');
        performanceInterceptor = Array.isArray(interceptors)
            ? interceptors.find((i) => i instanceof performance_interceptor_1.PerformanceInterceptor)
            : interceptors instanceof performance_interceptor_1.PerformanceInterceptor
                ? interceptors
                : null;
        await app.init();
        performanceInterceptor?.clearStats();
        cacheService?.clearStats();
        console.log('🚀 Starting API Performance Benchmarks');
        console.log(`Targets: <${PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95}ms P95, >${PERFORMANCE_TARGETS.MIN_THROUGHPUT} RPS`);
    });
    afterAll(async () => {
        await app.close();
    });
    describe('Response Time Benchmarks', () => {
        it('should meet response time targets for health endpoint', async () => {
            const responseTimes = [];
            console.log('🔥 Warming up health endpoint...');
            for (let i = 0; i < LOAD_TEST_CONFIG.WARM_UP_REQUESTS; i++) {
                await (0, supertest_1.default)(app.getHttpServer()).get('/health');
            }
            console.log('📊 Benchmarking health endpoint response times...');
            const startTime = Date.now();
            for (let i = 0; i < LOAD_TEST_CONFIG.BENCHMARK_REQUESTS; i++) {
                const requestStart = Date.now();
                const response = await (0, supertest_1.default)(app.getHttpServer()).get('/health');
                const requestDuration = Date.now() - requestStart;
                responseTimes.push(requestDuration);
                expect(response.status).toBe(200);
            }
            const totalDuration = Date.now() - startTime;
            const throughput = (LOAD_TEST_CONFIG.BENCHMARK_REQUESTS / totalDuration) * 1000;
            const sortedTimes = responseTimes.sort((a, b) => a - b);
            const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
            const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
            const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
            const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
            const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            console.log('📈 Health Endpoint Performance Results:');
            console.log(`  Average: ${avg.toFixed(2)}ms`);
            console.log(`  P50: ${p50}ms, P90: ${p90}ms, P95: ${p95}ms, P99: ${p99}ms`);
            console.log(`  Throughput: ${throughput.toFixed(2)} RPS`);
            expect(p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95);
            expect(throughput).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.MIN_THROUGHPUT);
        });
        it('should meet response time targets for metrics endpoint', async () => {
            const responseTimes = [];
            console.log('🔥 Warming up metrics endpoint...');
            for (let i = 0; i < LOAD_TEST_CONFIG.WARM_UP_REQUESTS; i++) {
                await (0, supertest_1.default)(app.getHttpServer()).get('/metrics');
            }
            console.log('📊 Benchmarking metrics endpoint response times...');
            const startTime = Date.now();
            for (let i = 0; i < LOAD_TEST_CONFIG.BENCHMARK_REQUESTS; i++) {
                const requestStart = Date.now();
                const response = await (0, supertest_1.default)(app.getHttpServer()).get('/metrics');
                const requestDuration = Date.now() - requestStart;
                responseTimes.push(requestDuration);
                expect(response.status).toBe(200);
                expect(response.get('Content-Type')).toContain('text/plain');
            }
            const totalDuration = Date.now() - startTime;
            const throughput = (LOAD_TEST_CONFIG.BENCHMARK_REQUESTS / totalDuration) * 1000;
            const sortedTimes = responseTimes.sort((a, b) => a - b);
            const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
            const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            console.log('📈 Metrics Endpoint Performance Results:');
            console.log(`  Average: ${avg.toFixed(2)}ms, P95: ${p95}ms`);
            console.log(`  Throughput: ${throughput.toFixed(2)} RPS`);
            expect(p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95);
            expect(throughput).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.MIN_THROUGHPUT);
        });
    });
    describe('Concurrent Load Testing', () => {
        it('should handle concurrent requests without performance degradation', async () => {
            const results = [];
            console.log(`🔀 Testing concurrent load: ${LOAD_TEST_CONFIG.CONCURRENT_USERS} concurrent users`);
            const concurrentPromises = Array(LOAD_TEST_CONFIG.CONCURRENT_USERS)
                .fill(null)
                .map(async (_, userIndex) => {
                const userResults = [];
                for (let i = 0; i < 20; i++) {
                    const start = Date.now();
                    try {
                        const response = await (0, supertest_1.default)(app.getHttpServer())
                            .get('/health')
                            .timeout(5000);
                        const duration = Date.now() - start;
                        userResults.push({ duration, status: response.status });
                    }
                    catch (error) {
                        const duration = Date.now() - start;
                        userResults.push({ duration, status: 500 });
                    }
                }
                return userResults;
            });
            const allResults = await Promise.all(concurrentPromises);
            allResults.forEach((userResults) => results.push(...userResults));
            const successfulRequests = results.filter((r) => r.status === 200);
            const successRate = (successfulRequests.length / results.length) * 100;
            const responseTimes = successfulRequests.map((r) => r.duration);
            const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
            const sortedTimes = responseTimes.sort((a, b) => a - b);
            const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
            console.log('📈 Concurrent Load Test Results:');
            console.log(`  Total Requests: ${results.length}`);
            console.log(`  Success Rate: ${successRate.toFixed(2)}%`);
            console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
            console.log(`  P95 Response Time: ${p95}ms`);
            expect(successRate).toBeGreaterThanOrEqual(99);
            expect(avgResponseTime).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95);
            expect(p95).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95 * 1.5);
        });
    });
    describe('Memory and Resource Utilization', () => {
        it('should maintain stable memory usage under sustained load', async () => {
            const initialMemory = process.memoryUsage();
            console.log('💾 Initial memory usage:', {
                rss: `${(initialMemory.rss / 1024 / 1024).toFixed(2)}MB`,
                heapUsed: `${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            });
            console.log('🔄 Running sustained load test...');
            const sustainedLoadPromises = [];
            for (let i = 0; i < 500; i++) {
                sustainedLoadPromises.push((0, supertest_1.default)(app.getHttpServer()).get('/health'));
                sustainedLoadPromises.push((0, supertest_1.default)(app.getHttpServer()).get('/metrics'));
            }
            await Promise.all(sustainedLoadPromises);
            if (global.gc) {
                global.gc();
            }
            const finalMemory = process.memoryUsage();
            const memoryIncrease = {
                rss: (finalMemory.rss - initialMemory.rss) / 1024 / 1024,
                heapUsed: (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024,
            };
            console.log('💾 Final memory usage:', {
                rss: `${(finalMemory.rss / 1024 / 1024).toFixed(2)}MB`,
                heapUsed: `${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            });
            console.log('📈 Memory increase:', {
                rss: `${memoryIncrease.rss.toFixed(2)}MB`,
                heapUsed: `${memoryIncrease.heapUsed.toFixed(2)}MB`,
            });
            expect(memoryIncrease.rss).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_MEMORY_INCREASE);
            expect(memoryIncrease.heapUsed).toBeLessThanOrEqual(PERFORMANCE_TARGETS.MAX_MEMORY_INCREASE);
        });
    });
    describe('Performance Interceptor Validation', () => {
        it('should collect accurate performance metrics', async () => {
            if (!performanceInterceptor) {
                console.warn('⚠️  Performance interceptor not available, skipping test');
                return;
            }
            performanceInterceptor.clearStats();
            const testRequests = 100;
            console.log(`📊 Generating ${testRequests} test requests for metrics validation...`);
            for (let i = 0; i < testRequests; i++) {
                await (0, supertest_1.default)(app.getHttpServer()).get('/health');
            }
            const stats = performanceInterceptor.getStats();
            console.log('📈 Performance Interceptor Stats:', {
                requestCount: stats.requestCount,
                averageResponseTime: `${stats.averageResponseTime.toFixed(2)}ms`,
                slowRequests: stats.slowRequests,
                p95ResponseTime: `${stats.p95ResponseTime}ms`,
            });
            expect(stats.requestCount).toBe(testRequests);
            expect(stats.averageResponseTime).toBeGreaterThan(0);
            expect(stats.p95ResponseTime).toBeGreaterThan(0);
            expect(stats.slowRequests).toBeGreaterThanOrEqual(0);
        });
    });
    describe('Cache Performance Validation', () => {
        it('should achieve target cache hit rates', async () => {
            if (cacheService) {
                cacheService.clearStats();
                console.log('💾 Priming cache for hit rate testing...');
                await cacheService.set('test-key-1', { data: 'test-value-1' }, { ttl: 300 });
                await cacheService.set('test-key-2', { data: 'test-value-2' }, { ttl: 300 });
                await cacheService.set('test-key-3', { data: 'test-value-3' }, { ttl: 300 });
                const cacheOperations = [];
                for (let i = 0; i < 100; i++) {
                    if (i % 4 === 0) {
                        cacheOperations.push(cacheService.get('non-existent-key'));
                    }
                    else {
                        const key = `test-key-${(i % 3) + 1}`;
                        cacheOperations.push(cacheService.get(key));
                    }
                }
                await Promise.all(cacheOperations);
                const cacheStats = cacheService.getStats();
                console.log('💾 Cache Performance Stats:', {
                    hits: cacheStats.hits,
                    misses: cacheStats.misses,
                    hitRate: `${cacheStats.hitRate.toFixed(2)}%`,
                    totalOperations: cacheStats.totalOperations,
                });
                expect(cacheStats.hitRate).toBeGreaterThanOrEqual(PERFORMANCE_TARGETS.MIN_CACHE_HIT_RATE);
                expect(cacheStats.totalOperations).toBeGreaterThan(0);
            }
        });
    });
    describe('Performance Summary Report', () => {
        it('should generate comprehensive performance report', async () => {
            console.log('\n🎯 PERFORMANCE BENCHMARK SUMMARY');
            console.log('=====================================');
            if (performanceInterceptor) {
                const perfStats = performanceInterceptor.getStats();
                console.log('📊 API Performance:');
                console.log(`  Total Requests: ${perfStats.requestCount}`);
                console.log(`  Average Response Time: ${perfStats.averageResponseTime.toFixed(2)}ms`);
                console.log(`  P95 Response Time: ${perfStats.p95ResponseTime}ms`);
                console.log(`  Slow Requests: ${perfStats.slowRequests}`);
                console.log(`  Memory Alerts: ${perfStats.memoryAlerts}`);
                const grade = perfStats.p95ResponseTime <= PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95
                    ? '🟢 EXCELLENT'
                    : perfStats.p95ResponseTime <=
                        PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95 * 1.5
                        ? '🟡 GOOD'
                        : '🔴 NEEDS IMPROVEMENT';
                console.log(`  Performance Grade: ${grade}`);
            }
            if (cacheService) {
                const cacheStats = cacheService.getStats();
                console.log('\n💾 Cache Performance:');
                console.log(`  Hit Rate: ${cacheStats.hitRate.toFixed(2)}%`);
                console.log(`  Total Operations: ${cacheStats.totalOperations}`);
                console.log(`  Cache Hits: ${cacheStats.hits}`);
                console.log(`  Cache Misses: ${cacheStats.misses}`);
                const cacheGrade = cacheStats.hitRate >= PERFORMANCE_TARGETS.MIN_CACHE_HIT_RATE
                    ? '🟢 EXCELLENT'
                    : cacheStats.hitRate >= 60
                        ? '🟡 GOOD'
                        : '🔴 NEEDS IMPROVEMENT';
                console.log(`  Cache Grade: ${cacheGrade}`);
            }
            console.log('\n🏆 Performance Targets:');
            console.log(`  ✅ Response Time P95: <${PERFORMANCE_TARGETS.MAX_RESPONSE_TIME_P95}ms`);
            console.log(`  ✅ Throughput: >${PERFORMANCE_TARGETS.MIN_THROUGHPUT} RPS`);
            console.log(`  ✅ Cache Hit Rate: >${PERFORMANCE_TARGETS.MIN_CACHE_HIT_RATE}%`);
            console.log(`  ✅ Memory Stability: <${PERFORMANCE_TARGETS.MAX_MEMORY_INCREASE}MB increase`);
            console.log('=====================================\n');
        });
    });
});
//# sourceMappingURL=api-performance.spec.js.map