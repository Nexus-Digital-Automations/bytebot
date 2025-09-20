# Job Management Testing Framework

## Overview

The Job Management Testing Framework is a comprehensive, enterprise-grade testing suite designed to validate all aspects of the job management system including functionality, performance, security, and resilience under various conditions.

## Framework Architecture

### Test Categories

1. **Unit Tests** - Fast, isolated component testing
2. **Integration Tests** - End-to-end workflow validation
3. **Performance Tests** - Load testing and benchmarking
4. **Chaos Engineering Tests** - Failure injection and resilience validation
5. **Security Tests** - Security compliance and vulnerability testing

### Directory Structure

```
test/
├── setup/                          # Test setup and configuration
│   ├── job-management-setup.ts     # Main test utilities
│   ├── unit-test-setup.ts          # Unit test specific setup
│   ├── integration-setup.ts        # Integration test setup
│   ├── performance-setup.ts        # Performance test setup
│   ├── chaos-setup.ts              # Chaos engineering setup
│   └── security-setup.ts           # Security test setup
├── integration/                    # Integration tests
│   └── job-management-e2e.spec.ts  # E2E workflow tests
├── performance/                    # Performance tests
│   └── job-management-load.spec.ts # Load and stress tests
├── chaos/                         # Chaos engineering tests
│   └── job-management-chaos.spec.ts # Failure injection tests
├── security/                      # Security tests
│   └── job-management-security.spec.ts # Security validation
└── reporters/                     # Custom test reporters
    ├── performance-reporter.js     # Performance metrics
    ├── chaos-reporter.js          # Chaos test results
    └── security-reporter.js       # Security test results
```

## Test Coverage

### Unit Tests Coverage

| Component | Test File | Coverage Target |
|-----------|-----------|-----------------|
| JobManagementService | `job-management.service.spec.ts` | 95% |
| JobStorage | `job-management-enhanced.spec.ts` | 90% |
| BackgroundWorker | `job-management-enhanced.spec.ts` | 90% |
| AsyncJobService | `async-job.service.spec.ts` | 85% |

**Key Test Scenarios:**
- Job creation and persistence
- Redis operations and failover
- Worker execution and scaling
- Error handling and retry logic
- Job encryption and decryption
- Memory management and cleanup

### Integration Tests Coverage

**End-to-End Workflows:**
- Complete job lifecycle (create → queue → execute → complete)
- Multi-worker coordination and scaling
- Error recovery and resilience
- Job cancellation and cleanup
- Real-time monitoring and metrics
- Data consistency validation

**Integration Test Scenarios:**
- Redis cluster integration
- Service dependency validation
- Cross-component communication
- Resource management
- Performance under load

### Performance Tests Coverage

**Performance Benchmarks:**
- Job submission rate: >1000 jobs/second
- Job execution latency: <500ms startup time
- Queue operations: <10ms for enqueue/dequeue
- Redis persistence: <15ms for read/write operations
- Worker scaling: Auto-scale from 2 to 10 workers under load

**Performance Test Scenarios:**
- High-throughput job submission
- Concurrent job execution scaling
- Redis performance under load
- Memory usage optimization
- Worker scaling efficiency
- Sustained load testing

### Chaos Engineering Tests Coverage

**Failure Scenarios:**
- Redis connection failures and recovery
- Network partitions and connectivity issues
- Worker crashes and restarts
- Memory pressure and resource exhaustion
- Concurrent failure combinations
- Service dependency failures

**Resilience Validation:**
- Graceful degradation under failures
- Automatic recovery mechanisms
- Data consistency during failures
- Job state preservation
- Error propagation and handling

### Security Tests Coverage

**Security Validation:**
- Data encryption and protection (AES-256-GCM)
- Access control and authorization
- Input validation and sanitization
- SQL injection prevention
- XSS and code injection protection
- Path traversal attack prevention
- Resource exhaustion protection

**Compliance Testing:**
- OWASP Top 10 vulnerabilities
- Encryption standards compliance
- Security audit logging
- Access pattern analysis

## Configuration

### Jest Configuration

The framework uses a specialized Jest configuration (`jest.config.job-management.js`) that provides different settings for each test type:

```javascript
// Run specific test types
TEST_TYPE=unit pnpm test:job-management      # Unit tests only
TEST_TYPE=integration pnpm test:job-management # Integration tests only
TEST_TYPE=performance pnpm test:job-management # Performance tests only
TEST_TYPE=chaos pnpm test:job-management    # Chaos tests only
TEST_TYPE=security pnpm test:job-management # Security tests only
TEST_TYPE=all pnpm test:job-management       # All tests
```

### Environment Variables

**Required for Integration/Performance/Chaos/Security Tests:**
```bash
REDIS_HOST=localhost           # Redis host
REDIS_PORT=6379               # Redis port
REDIS_PASSWORD=               # Redis password (optional)
REDIS_TEST_DB=15              # Test database number
REDIS_PERF_DB=14              # Performance test database
REDIS_CHAOS_DB=13             # Chaos test database
REDIS_SECURITY_DB=12          # Security test database
```

**Optional Configuration:**
```bash
NODE_ENV=test                 # Test environment
CI=true                       # CI environment flag
JOB_ENCRYPTION_KEY=           # Custom encryption key for tests
```

## CI/CD Integration

### GitHub Actions Workflow

The framework includes a comprehensive GitHub Actions workflow (`.github/workflows/job-management-tests.yml`) that:

**Triggers:**
- Push to main/develop branches
- Pull requests
- Daily scheduled runs (2 AM UTC)
- Manual workflow dispatch

**Test Matrix:**
- Multiple Node.js versions (18, 20)
- Different test types based on branch/trigger
- Environment-specific configurations

**Quality Gates:**
- Unit tests must pass (blocking)
- Security tests must pass (blocking)
- Performance benchmarks validation
- Code coverage thresholds
- Security vulnerability scanning

### Test Execution Strategy

| Test Type | When to Run | Duration | Resources |
|-----------|-------------|----------|-----------|
| Unit | Every commit | ~2-5 min | Minimal |
| Integration | Every PR | ~5-10 min | Redis |
| Performance | Main branch, scheduled | ~10-15 min | Redis, optimized system |
| Chaos | Main branch, manual | ~10-20 min | Redis, failure injection |
| Security | Every commit | ~5-10 min | Redis, vulnerability scanning |

## Usage Guide

### Running Tests Locally

1. **Setup Dependencies**
   ```bash
   cd bytebot/packages/bytebotd
   pnpm install
   ```

2. **Start Redis (for integration/performance/chaos/security tests)**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:7-alpine

   # Or using local Redis
   redis-server
   ```

3. **Run Tests**
   ```bash
   # All unit tests
   TEST_TYPE=unit pnpm test:job-management

   # All integration tests
   TEST_TYPE=integration pnpm test:job-management

   # Performance benchmarks
   TEST_TYPE=performance pnpm test:job-management

   # Chaos engineering
   TEST_TYPE=chaos pnpm test:job-management

   # Security validation
   TEST_TYPE=security pnpm test:job-management

   # Everything
   TEST_TYPE=all pnpm test:job-management
   ```

### Test Utilities

The framework provides extensive test utilities in `test/setup/job-management-setup.ts`:

```typescript
// Generate test data
const action = testUtils.generateTestAction('simple');
const options = testUtils.generateJobOptions({ priority: JobPriority.HIGH });

// Wait for job completion
const result = await testUtils.waitForJobCompletion(service, jobId, 30000);

// Create batch jobs
const jobIds = await testUtils.createJobsBatch(service, 100, 'simple');

// Performance measurement
const { result, time } = await testUtils.measureExecutionTime(async () => {
  return await service.createJob(action);
});

// Statistics calculation
const stats = testUtils.calculateStats(latencyArray);
```

### Mock Factories

```typescript
// Mock Redis client
const mockRedis = MockFactory.createMockRedis();

// Mock job management service
const mockService = MockFactory.createMockJobManagementService();
```

## Performance Benchmarks

### Target Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Job Submission Rate | >1000 jobs/sec | Jobs created per second |
| Execution Latency (P95) | <1000ms | Time from submit to complete |
| Queue Operation Latency | <10ms | Enqueue/dequeue operations |
| Redis Operation Latency | <15ms | Read/write operations |
| Memory Per Job | <2KB | Memory overhead per job |
| Worker Scaling Time | <5sec | Time to scale workers |

### Performance Test Reports

Performance tests generate detailed reports including:
- Throughput measurements
- Latency distributions (mean, median, P95, P99)
- Memory usage analysis
- Error rates
- Resource utilization

## Security Validation

### Security Test Categories

1. **Data Protection**
   - AES-256-GCM encryption validation
   - Key rotation testing
   - Data-at-rest security

2. **Access Control**
   - Job isolation between users
   - Authorization validation
   - Privilege escalation prevention

3. **Input Validation**
   - Malicious payload sanitization
   - Path traversal prevention
   - SQL injection prevention
   - XSS protection

4. **Execution Security**
   - Timeout enforcement
   - Resource limits
   - Environment isolation

### Security Compliance

The framework validates compliance with:
- OWASP Top 10 security standards
- Data protection regulations (GDPR considerations)
- Encryption standards (AES-256-GCM)
- Secure coding practices

## Chaos Engineering

### Failure Injection Scenarios

1. **Infrastructure Failures**
   - Redis connection drops
   - Network partitions
   - Disk I/O failures

2. **Resource Constraints**
   - Memory pressure
   - CPU exhaustion
   - Connection limits

3. **Service Failures**
   - Worker crashes
   - Service unavailability
   - Dependency failures

### Resilience Validation

Tests validate:
- Graceful degradation
- Automatic recovery
- Data consistency
- Error propagation
- Circuit breaker patterns

## Monitoring and Reporting

### Test Results

Each test type generates specific reports:
- **Unit Tests**: Coverage reports, test results
- **Integration Tests**: Workflow validation logs
- **Performance Tests**: Benchmark results, graphs
- **Chaos Tests**: Resilience metrics, failure scenarios
- **Security Tests**: Vulnerability reports, compliance status

### Metrics Collection

The framework collects:
- Test execution times
- Pass/fail rates
- Performance metrics
- Security findings
- Coverage statistics

### Alerting

CI/CD integration provides:
- GitHub PR comments with results
- Slack notifications for failures
- Email reports for scheduled runs
- Dashboard metrics updates

## Troubleshooting

### Common Issues

1. **Redis Connection Failures**
   ```bash
   # Check Redis is running
   redis-cli ping

   # Check test database
   redis-cli -n 15 ping
   ```

2. **Test Timeouts**
   ```bash
   # Increase timeout for specific tests
   TEST_TIMEOUT=120000 pnpm test:job-management
   ```

3. **Memory Issues**
   ```bash
   # Run with increased memory
   NODE_OPTIONS="--max-old-space-size=4096" pnpm test:job-management
   ```

4. **Port Conflicts**
   ```bash
   # Use different Redis port
   REDIS_PORT=6380 pnpm test:job-management
   ```

### Debug Mode

```bash
# Run with debug logging
DEBUG=job-management:* pnpm test:job-management

# Run single test file
npx jest test/integration/job-management-e2e.spec.ts --verbose
```

## Contributing

### Adding New Tests

1. **Unit Tests**: Add to `src/computer-use/__tests__/`
2. **Integration Tests**: Add to `test/integration/`
3. **Performance Tests**: Add to `test/performance/`
4. **Chaos Tests**: Add to `test/chaos/`
5. **Security Tests**: Add to `test/security/`

### Test Naming Conventions

- Test files: `*.spec.ts`
- Test suites: Descriptive component names
- Test cases: Should + expected behavior
- Variables: camelCase with descriptive names

### Quality Requirements

- **Unit Tests**: 85%+ coverage required
- **Integration Tests**: All workflows covered
- **Performance Tests**: Meet benchmark targets
- **Security Tests**: Zero critical vulnerabilities
- **Documentation**: All public APIs documented

## Best Practices

### Test Design

1. **Isolation**: Tests should not depend on external state
2. **Repeatability**: Tests should produce consistent results
3. **Performance**: Unit tests should be fast (<30s total)
4. **Clarity**: Test intent should be obvious from naming
5. **Coverage**: Focus on critical paths and edge cases

### Data Management

1. **Test Data**: Use factories for consistent test data
2. **Cleanup**: Always clean up test resources
3. **Isolation**: Use separate databases for each test type
4. **Reset**: Reset state between tests

### Error Handling

1. **Expected Errors**: Test error conditions explicitly
2. **Timeouts**: Set appropriate timeouts for async operations
3. **Logging**: Log enough detail for debugging
4. **Assertions**: Use specific assertions with clear messages

## Maintenance

### Regular Tasks

1. **Dependency Updates**: Keep test dependencies current
2. **Benchmark Updates**: Update performance targets as system improves
3. **Security Updates**: Add tests for new vulnerability patterns
4. **Documentation**: Keep documentation synchronized with code

### Monitoring

1. **Test Performance**: Monitor test execution times
2. **Flaky Tests**: Identify and fix unreliable tests
3. **Coverage Trends**: Track coverage changes over time
4. **Failure Patterns**: Analyze recurring test failures

## Conclusion

The Job Management Testing Framework provides comprehensive validation of system functionality, performance, security, and resilience. It integrates seamlessly with CI/CD pipelines and provides detailed reporting for quality assurance.

For questions or issues, refer to the troubleshooting section or contact the development team.