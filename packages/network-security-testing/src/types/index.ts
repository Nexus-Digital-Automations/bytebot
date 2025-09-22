/**
 * Comprehensive Network Security Testing Framework Types
 * Defines interfaces and types for network security testing and validation
 */

// Network Discovery Types
export interface NetworkDevice {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  os?: string;
  ports: Port[];
  services: Service[];
  vulnerabilities: Vulnerability[];
  lastSeen: Date;
  deviceType: DeviceType;
  security_score: number;
}

export interface Port {
  number: number;
  protocol: 'tcp' | 'udp';
  state: 'open' | 'closed' | 'filtered';
  service?: string;
  version?: string;
  banner?: string;
}

export interface Service {
  name: string;
  port: number;
  protocol: string;
  version?: string;
  state: 'running' | 'stopped' | 'unknown';
  vulnerabilities: string[];
  configuration: Record<string, any>;
}

export enum DeviceType {
  ROUTER = 'router',
  SWITCH = 'switch',
  FIREWALL = 'firewall',
  SERVER = 'server',
  WORKSTATION = 'workstation',
  MOBILE = 'mobile',
  IOT = 'iot',
  PRINTER = 'printer',
  UNKNOWN = 'unknown'
}

// Vulnerability Assessment Types
export interface Vulnerability {
  id: string;
  name: string;
  description: string;
  severity: VulnerabilitySeverity;
  cvss_score: number;
  cve_id?: string;
  affected_service: string;
  affected_port: number;
  discovery_method: string;
  remediation: string;
  references: string[];
  discovered_at: Date;
}

export enum VulnerabilitySeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

// Network Scanning Types
export interface ScanConfiguration {
  target: string | string[];
  scan_type: ScanType;
  port_range?: string;
  timing: ScanTiming;
  stealth_mode: boolean;
  version_detection: boolean;
  os_detection: boolean;
  script_scan: boolean;
  timeout: number;
  concurrent_threads: number;
}

export enum ScanType {
  PING_SWEEP = 'ping_sweep',
  PORT_SCAN = 'port_scan',
  SERVICE_SCAN = 'service_scan',
  VULNERABILITY_SCAN = 'vulnerability_scan',
  COMPREHENSIVE = 'comprehensive'
}

export enum ScanTiming {
  PARANOID = 'paranoid',
  SNEAKY = 'sneaky',
  POLITE = 'polite',
  NORMAL = 'normal',
  AGGRESSIVE = 'aggressive',
  INSANE = 'insane'
}

export interface ScanResult {
  id: string;
  configuration: ScanConfiguration;
  devices: NetworkDevice[];
  statistics: ScanStatistics;
  started_at: Date;
  completed_at: Date;
  duration: number;
  status: ScanStatus;
  errors: string[];
}

export interface ScanStatistics {
  total_hosts: number;
  hosts_up: number;
  total_ports_scanned: number;
  open_ports: number;
  services_detected: number;
  vulnerabilities_found: number;
  scan_rate: number;
}

export enum ScanStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

// Firewall Testing Types
export interface FirewallRule {
  id: string;
  name: string;
  source: string;
  destination: string;
  service: string;
  action: FirewallAction;
  enabled: boolean;
  log: boolean;
  description?: string;
}

export enum FirewallAction {
  ALLOW = 'allow',
  DENY = 'deny',
  DROP = 'drop',
  REJECT = 'reject'
}

export interface FirewallTestCase {
  id: string;
  name: string;
  description: string;
  source_ip: string;
  destination_ip: string;
  destination_port: number;
  protocol: string;
  expected_result: FirewallAction;
  test_type: FirewallTestType;
}

export enum FirewallTestType {
  RULE_VALIDATION = 'rule_validation',
  BYPASS_ATTEMPT = 'bypass_attempt',
  EVASION_TEST = 'evasion_test',
  PERFORMANCE_TEST = 'performance_test'
}

export interface FirewallTestResult {
  test_case: FirewallTestCase;
  actual_result: FirewallAction;
  passed: boolean;
  response_time: number;
  error?: string;
  timestamp: Date;
}

// SSL/TLS Testing Types
export interface SSLTestConfiguration {
  target: string;
  port: number;
  protocols: SSLProtocol[];
  ciphers: string[];
  certificate_validation: boolean;
  vulnerability_checks: boolean;
  timeout: number;
}

export enum SSLProtocol {
  SSLV2 = 'SSLv2',
  SSLV3 = 'SSLv3',
  TLSV1 = 'TLSv1',
  TLSV1_1 = 'TLSv1.1',
  TLSV1_2 = 'TLSv1.2',
  TLSV1_3 = 'TLSv1.3'
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  valid_from: Date;
  valid_to: Date;
  fingerprint: string;
  signature_algorithm: string;
  key_size: number;
  serial_number: string;
  is_valid: boolean;
  is_expired: boolean;
  days_until_expiry: number;
  vulnerabilities: string[];
}

export interface SSLTestResult {
  target: string;
  supported_protocols: SSLProtocol[];
  supported_ciphers: string[];
  certificate: CertificateInfo;
  vulnerabilities: SSLVulnerability[];
  grade: SSLGrade;
  warnings: string[];
  timestamp: Date;
}

export interface SSLVulnerability {
  name: string;
  severity: VulnerabilitySeverity;
  description: string;
  impact: string;
  remediation: string;
}

export enum SSLGrade {
  A_PLUS = 'A+',
  A = 'A',
  A_MINUS = 'A-',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F'
}

// Intrusion Detection Types
export interface IntrusionEvent {
  id: string;
  timestamp: Date;
  source_ip: string;
  destination_ip: string;
  source_port?: number;
  destination_port?: number;
  protocol: string;
  event_type: IntrusionEventType;
  severity: VulnerabilitySeverity;
  signature: string;
  description: string;
  raw_data: string;
  classification: ThreatClassification;
  false_positive_likelihood: number;
}

export enum IntrusionEventType {
  PORT_SCAN = 'port_scan',
  BRUTE_FORCE = 'brute_force',
  DOS_ATTACK = 'dos_attack',
  MALWARE = 'malware',
  SUSPICIOUS_TRAFFIC = 'suspicious_traffic',
  POLICY_VIOLATION = 'policy_violation',
  ANOMALY = 'anomaly'
}

export enum ThreatClassification {
  CONFIRMED_THREAT = 'confirmed_threat',
  LIKELY_THREAT = 'likely_threat',
  SUSPICIOUS = 'suspicious',
  BENIGN = 'benign',
  UNKNOWN = 'unknown'
}

export interface IDSConfiguration {
  rules: IDSRule[];
  sensitivity: IDSSensitivity;
  learning_mode: boolean;
  whitelist: string[];
  blacklist: string[];
  log_level: LogLevel;
}

export interface IDSRule {
  id: string;
  name: string;
  description: string;
  pattern: string;
  action: IDSAction;
  enabled: boolean;
  threshold: number;
  window: number;
}

export enum IDSAction {
  ALERT = 'alert',
  LOG = 'log',
  BLOCK = 'block',
  QUARANTINE = 'quarantine'
}

export enum IDSSensitivity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  PARANOID = 'paranoid'
}

// Network Monitoring Types
export interface NetworkMetrics {
  timestamp: Date;
  bandwidth_utilization: BandwidthMetrics;
  connection_stats: ConnectionStats;
  security_stats: SecurityStats;
  performance_stats: PerformanceStats;
}

export interface BandwidthMetrics {
  inbound_mbps: number;
  outbound_mbps: number;
  total_mbps: number;
  utilization_percentage: number;
  peak_usage: number;
  average_usage: number;
}

export interface ConnectionStats {
  active_connections: number;
  new_connections_per_second: number;
  failed_connections: number;
  connection_timeouts: number;
  top_talkers: TopTalker[];
}

export interface TopTalker {
  ip: string;
  bytes_sent: number;
  bytes_received: number;
  connections: number;
  protocols: string[];
}

export interface SecurityStats {
  blocked_attempts: number;
  suspicious_events: number;
  malware_detected: number;
  policy_violations: number;
  threat_score: number;
}

export interface PerformanceStats {
  latency_ms: number;
  packet_loss_percentage: number;
  jitter_ms: number;
  throughput_mbps: number;
  response_time_ms: number;
}

// Alert and Notification Types
export interface SecurityAlert {
  id: string;
  timestamp: Date;
  type: AlertType;
  severity: VulnerabilitySeverity;
  title: string;
  description: string;
  source: string;
  target?: string;
  indicators: Record<string, any>;
  recommendation: string;
  status: AlertStatus;
  acknowledged_by?: string;
  acknowledged_at?: Date;
  resolution?: string;
  resolved_at?: Date;
}

export enum AlertType {
  VULNERABILITY_DETECTED = 'vulnerability_detected',
  INTRUSION_ATTEMPT = 'intrusion_attempt',
  POLICY_VIOLATION = 'policy_violation',
  PERFORMANCE_DEGRADATION = 'performance_degradation',
  SERVICE_UNAVAILABLE = 'service_unavailable',
  CERTIFICATE_EXPIRING = 'certificate_expiring',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior'
}

export enum AlertStatus {
  NEW = 'new',
  ACKNOWLEDGED = 'acknowledged',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  FALSE_POSITIVE = 'false_positive'
}

// Configuration Types
export interface NetworkSecurityConfig {
  scanning: ScanConfiguration;
  firewall_testing: FirewallTestingConfig;
  ssl_testing: SSLTestConfiguration;
  intrusion_detection: IDSConfiguration;
  monitoring: MonitoringConfig;
  alerting: AlertingConfig;
  reporting: ReportingConfig;
}

export interface FirewallTestingConfig {
  test_interval: number;
  test_suites: string[];
  performance_thresholds: PerformanceThresholds;
  evasion_techniques: string[];
}

export interface MonitoringConfig {
  collection_interval: number;
  retention_period: number;
  metrics_to_collect: string[];
  baseline_learning_period: number;
  anomaly_threshold: number;
}

export interface AlertingConfig {
  channels: AlertChannel[];
  escalation_rules: EscalationRule[];
  notification_throttling: ThrottlingConfig;
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  configuration: Record<string, any>;
  enabled: boolean;
}

export interface EscalationRule {
  severity_threshold: VulnerabilitySeverity;
  time_threshold: number;
  escalation_targets: string[];
}

export interface ThrottlingConfig {
  max_alerts_per_hour: number;
  duplicate_suppression_window: number;
  burst_threshold: number;
}

export interface ReportingConfig {
  schedule: string;
  recipients: string[];
  format: 'pdf' | 'html' | 'json';
  include_charts: boolean;
  include_recommendations: boolean;
}

export interface PerformanceThresholds {
  max_response_time: number;
  max_packet_loss: number;
  min_throughput: number;
  max_latency: number;
}

// Common Types
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface BaseResponse {
  success: boolean;
  message: string;
  timestamp: Date;
  data?: any;
  errors?: string[];
}

export interface PaginatedResponse<T> extends BaseResponse {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// API Types
export interface NetworkSecurityTestingAPI {
  // Network scanning endpoints
  startScan(config: ScanConfiguration): Promise<BaseResponse>;
  getScanResults(scanId: string): Promise<ScanResult>;
  listScans(filters?: any): Promise<PaginatedResponse<ScanResult>>;

  // Firewall testing endpoints
  runFirewallTests(config: FirewallTestingConfig): Promise<BaseResponse>;
  getFirewallTestResults(testId: string): Promise<FirewallTestResult[]>;

  // SSL/TLS testing endpoints
  testSSL(config: SSLTestConfiguration): Promise<SSLTestResult>;
  validateCertificate(target: string, port: number): Promise<CertificateInfo>;

  // Intrusion detection endpoints
  getIntrusionEvents(filters?: any): Promise<PaginatedResponse<IntrusionEvent>>;
  acknowledgeAlert(alertId: string): Promise<BaseResponse>;

  // Monitoring endpoints
  getCurrentMetrics(): Promise<NetworkMetrics>;
  getHistoricalMetrics(timeRange: string): Promise<NetworkMetrics[]>;

  // Configuration endpoints
  getConfiguration(): Promise<NetworkSecurityConfig>;
  updateConfiguration(config: Partial<NetworkSecurityConfig>): Promise<BaseResponse>;
}