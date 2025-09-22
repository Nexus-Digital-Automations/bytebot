# Network Security Testing Framework

A comprehensive, enterprise-grade network security testing and validation framework built with TypeScript. This framework provides advanced capabilities for network scanning, vulnerability assessment, firewall testing, intrusion detection, SSL/TLS analysis, and real-time security monitoring.

## 🚀 Features

### Core Components

- **🔍 Network Scanner**: Advanced network discovery, port scanning, and service enumeration
- **🛡️ Vulnerability Scanner**: Comprehensive vulnerability assessment with CVE database integration
- **🚪 Firewall Tester**: Firewall rule validation, bypass testing, and compliance verification
- **🚨 Intrusion Detection System**: Real-time threat detection with behavioral analysis
- **🔒 SSL/TLS Tester**: SSL/TLS configuration analysis and vulnerability assessment
- **📊 Security Monitor**: Real-time monitoring with alerting and dashboard capabilities
- **🧪 Test Suite**: Comprehensive automated testing framework

### Key Capabilities

- **Multi-Protocol Support**: TCP, UDP, ICMP, HTTP/HTTPS, SSL/TLS
- **Advanced Scanning**: Stealth scanning, OS fingerprinting, service version detection
- **Vulnerability Database**: Integration with CVE databases and exploit frameworks
- **Behavioral Analysis**: Machine learning-based anomaly detection
- **Real-time Monitoring**: Live dashboards with customizable metrics
- **Automated Alerting**: Multi-channel notifications with escalation rules
- **Compliance Testing**: PCI DSS, HIPAA, SOX compliance validation
- **Comprehensive Reporting**: JSON, HTML, and PDF report generation

## 📦 Installation

```bash
# Install the package
npm install @bytebot/network-security-testing

# Or install globally for CLI usage
npm install -g @bytebot/network-security-testing
```

## 🛠️ Usage

### CLI Interface

The framework includes a comprehensive command-line interface:

```bash
# Network scanning
network-security-testing scan --target 192.168.1.0/24 --type comprehensive

# Firewall testing
network-security-testing firewall --target 192.168.1.1 --test-suites basic,security

# SSL/TLS testing
network-security-testing ssl --target example.com --port 443 --vulnerabilities

# Security monitoring
network-security-testing monitor --duration 300 --dashboard

# Comprehensive assessment
network-security-testing assess --targets "192.168.1.1,example.com" --output report.json

# Run test suite
network-security-testing test --categories scanning,vulnerability --verbose
```

### Programmatic API

```typescript
import {
  NetworkSecurityTestingFramework,
  NetworkSecurityConfig,
  ScanType,
  VulnerabilitySeverity
} from '@bytebot/network-security-testing';

// Initialize framework
const config: NetworkSecurityConfig = {
  scanning: {
    target: '192.168.1.0/24',
    scan_type: ScanType.COMPREHENSIVE,
    timing: 'normal',
    stealth_mode: false,
    version_detection: true,
    os_detection: true,
    script_scan: true,
    timeout: 30,
    concurrent_threads: 10
  },
  // ... other configuration options
};

const framework = new NetworkSecurityTestingFramework(config);

// Initialize and run assessment
async function runSecurityAssessment() {
  await framework.initialize();

  const assessment = await framework.runSecurityAssessment([
    '192.168.1.1',
    '192.168.1.100'
  ]);

  console.log(`Security Score: ${assessment.summary.securityScore}/100`);
  console.log(`Vulnerabilities Found: ${assessment.summary.vulnerabilitiesFound}`);

  await framework.shutdown();
}

runSecurityAssessment();
```

### Individual Components

```typescript
import {
  NetworkScanner,
  VulnerabilityScanner,
  FirewallTester,
  SSLTester,
  IntrusionDetectionSystem,
  SecurityMonitor
} from '@bytebot/network-security-testing';

// Network scanning
const scanner = new NetworkScanner();
const scanId = await scanner.startScan({
  target: '192.168.1.0/24',
  scan_type: 'comprehensive',
  // ... configuration
});

const scanResult = scanner.getScanResult(scanId);

// Vulnerability scanning
const vulnScanner = new VulnerabilityScanner();
const vulnerabilities = await vulnScanner.scanDevice(device);

// SSL/TLS testing
const sslTester = new SSLTester();
const sslResult = await sslTester.testSSLConfiguration({
  target: 'example.com',
  port: 443,
  protocols: ['TLSv1.2', 'TLSv1.3'],
  vulnerability_checks: true
});

// Intrusion detection
const ids = new IntrusionDetectionSystem(idsConfig);
await ids.start();

ids.on('intrusionEvent', (event) => {
  console.log(`Security event: ${event.signature}`);
});

// Security monitoring
const monitor = new SecurityMonitor(monitorConfig, alertConfig);
await monitor.startMonitoring();

const metrics = await monitor.getCurrentMetrics();
const status = monitor.getSecurityStatus();
```

## 🔧 Configuration

### Network Security Configuration

```typescript
const config: NetworkSecurityConfig = {
  scanning: {
    target: '192.168.1.0/24',
    scan_type: ScanType.COMPREHENSIVE,
    port_range: '1-65535',
    timing: ScanTiming.NORMAL,
    stealth_mode: false,
    version_detection: true,
    os_detection: true,
    script_scan: true,
    timeout: 30,
    concurrent_threads: 10
  },

  firewall_testing: {
    test_interval: 300,
    test_suites: ['basic', 'security', 'performance'],
    performance_thresholds: {
      max_response_time: 1000,
      max_packet_loss: 5,
      min_throughput: 100,
      max_latency: 100
    },
    evasion_techniques: ['fragmentation', 'encoding', 'tunneling']
  },

  ssl_testing: {
    target: 'localhost',
    port: 443,
    protocols: [SSLProtocol.TLSV1_2, SSLProtocol.TLSV1_3],
    ciphers: [],
    certificate_validation: true,
    vulnerability_checks: true,
    timeout: 10000
  },

  intrusion_detection: {
    rules: [],
    sensitivity: IDSSensitivity.MEDIUM,
    learning_mode: true,
    whitelist: ['192.168.1.0/24'],
    blacklist: [],
    log_level: LogLevel.INFO
  },

  monitoring: {
    collection_interval: 5000,
    retention_period: 86400000, // 24 hours
    metrics_to_collect: [
      'bandwidth',
      'connections',
      'security',
      'performance'
    ],
    baseline_learning_period: 300000, // 5 minutes
    anomaly_threshold: 0.8
  },

  alerting: {
    channels: [
      {
        type: 'email',
        configuration: {
          smtp_server: 'smtp.example.com',
          recipients: ['security@example.com']
        },
        enabled: true
      }
    ],
    escalation_rules: [
      {
        severity_threshold: VulnerabilitySeverity.HIGH,
        time_threshold: 300, // 5 minutes
        escalation_targets: ['manager@example.com']
      }
    ],
    notification_throttling: {
      max_alerts_per_hour: 100,
      duplicate_suppression_window: 300,
      burst_threshold: 10
    }
  },

  reporting: {
    schedule: '0 0 * * *', // Daily at midnight
    recipients: ['security-team@example.com'],
    format: 'html',
    include_charts: true,
    include_recommendations: true
  }
};
```

### Environment Variables

```bash
# Logging configuration
LOG_LEVEL=info
LOG_DIR=./logs

# Database configuration (for vulnerability data)
VDB_CONNECTION_STRING=mongodb://localhost:27017/vulnerabilities

# External API keys
CVE_API_KEY=your-cve-api-key
SHODAN_API_KEY=your-shodan-api-key

# Network configuration
DEFAULT_INTERFACE=eth0
PACKET_CAPTURE_BUFFER_SIZE=1048576

# Security settings
ENCRYPTION_KEY=your-encryption-key
API_RATE_LIMIT=1000
```

## 📊 Dashboard and Monitoring

### Real-time Dashboard

The framework includes a web-based dashboard for real-time monitoring:

```typescript
// Start monitoring with dashboard
await monitor.startMonitoring();

// Create custom dashboard
const dashboard = monitor.createDashboard('Security Overview', [
  {
    type: 'gauge',
    title: 'Security Score',
    config: { metric: 'security_stats.threat_score', max: 100 },
    position: { x: 0, y: 0, width: 6, height: 4 }
  },
  {
    type: 'chart',
    title: 'Threat Trends',
    config: { metric: 'security_stats.threat_score', timeRange: '24h' },
    position: { x: 6, y: 0, width: 6, height: 4 }
  }
]);

// Get dashboard data
const dashboardData = await monitor.getDashboardData(dashboard.id);
```

### Metrics Collection

```typescript
// Get current metrics
const metrics = await monitor.getCurrentMetrics();

console.log('Bandwidth:', metrics.bandwidth_utilization);
console.log('Connections:', metrics.connection_stats);
console.log('Security:', metrics.security_stats);
console.log('Performance:', metrics.performance_stats);

// Get historical metrics
const historical = monitor.getHistoricalMetrics({
  start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
  end: new Date()
});

// Get security trends
const trends = monitor.getSecurityTrends({
  start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
  end: new Date()
});
```

## 🚨 Alerting and Notifications

### Custom Alert Rules

```typescript
// Add custom alert rule
const ruleId = monitor.addAlertRule({
  name: 'High Vulnerability Count',
  description: 'Alert when vulnerability count exceeds threshold',
  condition: (metrics) => metrics.security_stats.suspicious_events > 50,
  severity: VulnerabilitySeverity.HIGH,
  enabled: true,
  throttle_seconds: 300
});

// Handle security alerts
monitor.on('securityAlert', (alert) => {
  console.log(`🚨 Security Alert: ${alert.title}`);
  console.log(`Severity: ${alert.severity}`);
  console.log(`Description: ${alert.description}`);

  // Custom alert handling logic
  if (alert.severity === VulnerabilitySeverity.CRITICAL) {
    // Immediate escalation
    notifySecurityTeam(alert);
  }
});
```

### Integration with External Systems

```typescript
// Webhook notifications
alertConfig.channels.push({
  type: 'webhook',
  configuration: {
    url: 'https://hooks.slack.com/services/...',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  },
  enabled: true
});

// Custom notification handlers
monitor.on('securityAlert', async (alert) => {
  // Send to SIEM system
  await sendToSIEM(alert);

  // Create ticket in ITSM
  await createSecurityTicket(alert);

  // Update threat intelligence feeds
  await updateThreatIntel(alert);
});
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:scanning
npm run test:vulnerability
npm run test:firewall
npm run test:ssl
npm run test:monitoring

# Run with coverage
npm run test:coverage

# Run integration tests
npm run test:integration
```

### Custom Test Cases

```typescript
import { SecurityTestSuite } from '@bytebot/network-security-testing';

const testSuite = new SecurityTestSuite({
  target_network: '192.168.1.0/24',
  target_host: '192.168.1.1',
  target_ports: [80, 443, 22],
  firewall_host: '192.168.1.1',
  test_data_path: './test-data',
  cleanup_after_tests: true
});

// Add custom test case
testSuite.addTestCase({
  name: 'Custom Security Test',
  description: 'Test custom security requirement',
  category: 'security',
  priority: 'high',
  timeout: 30000,
  test: async () => {
    // Custom test implementation
    const result = await performCustomSecurityCheck();

    return {
      testId: 'custom-test',
      name: 'Custom Security Test',
      status: result.passed ? 'passed' : 'failed',
      duration: result.duration,
      assertions: result.assertions
    };
  }
});

// Run test suite
const results = await testSuite.runTestSuite();
```

## 📖 API Documentation

### Core Classes

#### NetworkScanner

```typescript
class NetworkScanner {
  async startScan(config: ScanConfiguration): Promise<string>
  getScanResult(scanId: string): ScanResult | null
  listScanResults(): ScanResult[]
  async cancelScan(): Promise<boolean>
}
```

#### VulnerabilityScanner

```typescript
class VulnerabilityScanner {
  async scanDevice(device: NetworkDevice): Promise<Vulnerability[]>
  async scanService(host: string, service: Service): Promise<Vulnerability[]>
}
```

#### FirewallTester

```typescript
class FirewallTester {
  async runFirewallTests(config: FirewallTestConfiguration): Promise<FirewallTestResult[]>
  async testFirewallRule(target: string, rule: FirewallRule, traffic: TestTraffic): Promise<FirewallTestResult>
  async testFirewallBypass(target: string, service: string, techniques: string[]): Promise<FirewallTestResult[]>
}
```

#### SSLTester

```typescript
class SSLTester {
  async testSSLConfiguration(config: SSLTestConfiguration): Promise<SSLTestResult>
  async testSpecificVulnerability(target: string, port: number, vulnerability: string): Promise<SSLVulnerability | null>
  async validateCertificateChain(target: string, port: number): Promise<CertificateValidationResult>
}
```

#### IntrusionDetectionSystem

```typescript
class IntrusionDetectionSystem {
  async start(): Promise<void>
  async stop(): Promise<void>
  async processPacket(packet: NetworkPacket): Promise<void>
  addRule(rule: IDSRule): void
  removeRule(ruleId: string): boolean
  getEvents(filters?: EventFilters): IntrusionEvent[]
  updateConfiguration(config: Partial<IDSConfiguration>): void
  getStatistics(): IDSStatistics
}
```

#### SecurityMonitor

```typescript
class SecurityMonitor {
  async startMonitoring(): Promise<void>
  async stopMonitoring(): Promise<void>
  async getCurrentMetrics(): Promise<NetworkMetrics>
  getHistoricalMetrics(timeRange: TimeRange): NetworkMetrics[]
  getSecurityTrends(timeRange?: TimeRange): SecurityTrend[]
  createDashboard(name: string, widgets: DashboardWidget[]): Dashboard
  async getDashboardData(dashboardId: string): Promise<DashboardData | null>
  addAlertRule(rule: AlertRule): string
  processIntrusionEvent(event: IntrusionEvent): void
  getSecurityStatus(): SecurityStatus
}
```

## 🔒 Security Considerations

### Data Protection

- **Encryption**: All sensitive data is encrypted at rest and in transit
- **Authentication**: Role-based access control for API endpoints
- **Audit Logging**: Comprehensive audit trails for all security operations
- **Data Retention**: Configurable data retention policies

### Network Safety

- **Rate Limiting**: Built-in rate limiting to prevent network overload
- **Target Validation**: Verification of scan targets before execution
- **Permission Checks**: Validation of scanning permissions
- **Safe Defaults**: Conservative default configurations

### Compliance

- **GDPR**: Data protection and privacy compliance
- **SOC 2**: Security controls and monitoring
- **ISO 27001**: Information security management
- **NIST**: Cybersecurity framework compliance

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/bytebot/network-security-testing.git
cd network-security-testing

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Start development mode
npm run dev
```

### Code Style

```bash
# Format code
npm run format

# Lint code
npm run lint

# Type checking
npm run typecheck
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: [https://docs.bytebot.dev/network-security-testing](https://docs.bytebot.dev/network-security-testing)
- **Issues**: [GitHub Issues](https://github.com/bytebot/network-security-testing/issues)
- **Discussions**: [GitHub Discussions](https://github.com/bytebot/network-security-testing/discussions)
- **Email**: security@bytebot.dev

## 🙏 Acknowledgments

- **nmap**: Network exploration and security auditing
- **OpenVAS**: Vulnerability scanning capabilities
- **OWASP**: Security testing methodologies
- **CVE Database**: Vulnerability information
- **Security Community**: Continuous improvement and feedback

---

**⚠️ Disclaimer**: This framework is intended for authorized security testing only. Users are responsible for ensuring they have proper authorization before scanning or testing any networks or systems. Unauthorized use may violate laws and regulations.