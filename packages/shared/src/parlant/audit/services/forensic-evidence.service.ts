/**
 * PARLANT Phase 1 Forensic Evidence Collection and Preservation Service
 *
 * Enterprise-grade forensic evidence collection and preservation system for
 * audit trail events with chain of custody, integrity verification, and
 * legal compliance features.
 *
 * Features:
 * - Tamper-evident evidence collection
 * - Cryptographic chain of custody
 * - Legal admissibility preservation
 * - Multi-level integrity verification
 * - Evidence retention and disposal
 * - Expert witness support
 * - Court-ready evidence packages
 *
 * @fileoverview Forensic evidence collection and preservation service
 * @version 1.0.0
 * @author Claude Code - Audit Trail System Agent
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  AuditEvent,
  AuditEventId,
  ForensicEvidenceId,
  AuditEventSeverity,
  ForensicMetadata,
} from '../types/audit-core.types';
import { createHash, randomBytes, createHmac, createSign, createVerify } from 'crypto';
import { performance } from 'perf_hooks';

// ===========================
// FORENSIC EVIDENCE INTERFACES
// ===========================

/**
 * Forensic evidence package
 */
export interface ForensicEvidencePackage {
  /** Evidence identifier */
  evidenceId: ForensicEvidenceId;

  /** Package creation timestamp */
  creationTimestamp: Date;

  /** Evidence collection metadata */
  collectionMetadata: EvidenceCollectionMetadata;

  /** Chain of custody */
  chainOfCustody: ChainOfCustodyEntry[];

  /** Evidence items */
  evidenceItems: EvidenceItem[];

  /** Integrity verification */
  integrityVerification: EvidenceIntegrityVerification;

  /** Legal metadata */
  legalMetadata: LegalMetadata;

  /** Preservation metadata */
  preservationMetadata: PreservationMetadata;

  /** Expert witness assignments */
  expertWitnessAssignments: ExpertWitnessAssignment[];

  /** Package integrity hash */
  packageIntegrityHash: string;

  /** Digital signature */
  digitalSignature: DigitalSignature;
}

/**
 * Evidence collection metadata
 */
export interface EvidenceCollectionMetadata {
  /** Collection timestamp */
  collectionTimestamp: Date;

  /** Collection method */
  collectionMethod: EvidenceCollectionMethod;

  /** Collector information */
  collectorInfo: CollectorInfo;

  /** Collection environment */
  collectionEnvironment: CollectionEnvironment;

  /** Collection tools used */
  collectionTools: CollectionTool[];

  /** Collection certification */
  collectionCertification: CollectionCertification;

  /** Collection quality metrics */
  qualityMetrics: CollectionQualityMetrics;
}

/**
 * Evidence collection methods
 */
export enum EvidenceCollectionMethod {
  AUTOMATED_CAPTURE = 'automated_capture',
  MANUAL_EXTRACTION = 'manual_extraction',
  LIVE_IMAGING = 'live_imaging',
  MEMORY_DUMP = 'memory_dump',
  NETWORK_CAPTURE = 'network_capture',
  DATABASE_EXPORT = 'database_export',
  LOG_EXTRACTION = 'log_extraction',
  FILE_SYSTEM_COPY = 'file_system_copy',
}

/**
 * Collector information
 */
export interface CollectorInfo {
  /** Collector identifier */
  collectorId: string;

  /** Collector name */
  name: string;

  /** Collector role */
  role: string;

  /** Collector certification */
  certification: string[];

  /** Collector organization */
  organization: string;

  /** Contact information */
  contactInfo: ContactInfo;

  /** Collection authorization */
  authorization: CollectionAuthorization;
}

/**
 * Contact information
 */
export interface ContactInfo {
  /** Email address */
  email: string;

  /** Phone number */
  phone: string;

  /** Physical address */
  address: string;

  /** Emergency contact */
  emergencyContact: string;
}

/**
 * Collection authorization
 */
export interface CollectionAuthorization {
  /** Authorization type */
  authorizationType: AuthorizationType;

  /** Authorization reference */
  authorizationReference: string;

  /** Authorizing authority */
  authorizingAuthority: string;

  /** Authorization timestamp */
  authorizationTimestamp: Date;

  /** Authorization expiry */
  authorizationExpiry?: Date;

  /** Scope of authorization */
  scope: AuthorizationScope;
}

/**
 * Authorization types
 */
export enum AuthorizationType {
  COURT_ORDER = 'court_order',
  SEARCH_WARRANT = 'search_warrant',
  REGULATORY_ORDER = 'regulatory_order',
  CONSENT = 'consent',
  BUSINESS_AUTHORIZATION = 'business_authorization',
  EMERGENCY_AUTHORIZATION = 'emergency_authorization',
  POLICY_AUTHORIZATION = 'policy_authorization',
}

/**
 * Authorization scope
 */
export interface AuthorizationScope {
  /** Authorized systems */
  authorizedSystems: string[];

  /** Authorized data types */
  authorizedDataTypes: string[];

  /** Authorized time range */
  authorizedTimeRange: TimeRange;

  /** Geographic limitations */
  geographicLimitations: string[];

  /** Data usage restrictions */
  dataUsageRestrictions: string[];
}

/**
 * Time range
 */
export interface TimeRange {
  /** Start time */
  startTime: Date;

  /** End time */
  endTime?: Date;

  /** Open-ended flag */
  openEnded: boolean;
}

/**
 * Collection environment
 */
export interface CollectionEnvironment {
  /** Environment type */
  environmentType: EnvironmentType;

  /** System information */
  systemInfo: SystemInfo;

  /** Network information */
  networkInfo: NetworkInfo;

  /** Security context */
  securityContext: SecurityContext;

  /** Environmental conditions */
  environmentalConditions: EnvironmentalConditions;
}

/**
 * Environment types
 */
export enum EnvironmentType {
  PRODUCTION = 'production',
  STAGING = 'staging',
  TESTING = 'testing',
  DEVELOPMENT = 'development',
  DISASTER_RECOVERY = 'disaster_recovery',
  OFFLINE = 'offline',
}

/**
 * System information
 */
export interface SystemInfo {
  /** Operating system */
  operatingSystem: string;

  /** OS version */
  osVersion: string;

  /** Hardware information */
  hardwareInfo: HardwareInfo;

  /** Software inventory */
  softwareInventory: SoftwareItem[];

  /** System configuration */
  systemConfiguration: SystemConfiguration;

  /** Security settings */
  securitySettings: SecuritySettings;
}

/**
 * Hardware information
 */
export interface HardwareInfo {
  /** CPU information */
  cpu: string;

  /** Memory information */
  memory: string;

  /** Storage information */
  storage: StorageInfo[];

  /** Network interfaces */
  networkInterfaces: NetworkInterface[];

  /** Hardware serial numbers */
  serialNumbers: Record<string, string>;
}

/**
 * Storage information
 */
export interface StorageInfo {
  /** Device type */
  deviceType: string;

  /** Device identifier */
  deviceId: string;

  /** Capacity */
  capacity: number;

  /** File system */
  fileSystem: string;

  /** Mount point */
  mountPoint: string;

  /** Encryption status */
  encrypted: boolean;
}

/**
 * Network interface
 */
export interface NetworkInterface {
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
 * Software item
 */
export interface SoftwareItem {
  /** Software name */
  name: string;

  /** Software version */
  version: string;

  /** Vendor */
  vendor: string;

  /** Installation date */
  installationDate: Date;

  /** License information */
  licenseInfo: string;

  /** Software hash */
  softwareHash: string;
}

/**
 * System configuration
 */
export interface SystemConfiguration {
  /** Configuration files */
  configurationFiles: ConfigurationFile[];

  /** Environment variables */
  environmentVariables: Record<string, string>;

  /** System settings */
  systemSettings: Record<string, unknown>;

  /** Security policies */
  securityPolicies: SecurityPolicy[];
}

/**
 * Configuration file
 */
export interface ConfigurationFile {
  /** File path */
  filePath: string;

  /** File hash */
  fileHash: string;

  /** Last modified */
  lastModified: Date;

  /** File size */
  fileSize: number;

  /** File permissions */
  permissions: string;

  /** Configuration content hash */
  contentHash: string;
}

/**
 * Security policy
 */
export interface SecurityPolicy {
  /** Policy name */
  policyName: string;

  /** Policy version */
  policyVersion: string;

  /** Policy settings */
  policySettings: Record<string, unknown>;

  /** Policy enforcement */
  enforcement: PolicyEnforcement;

  /** Last updated */
  lastUpdated: Date;
}

/**
 * Policy enforcement
 */
export enum PolicyEnforcement {
  ENFORCED = 'enforced',
  AUDIT_ONLY = 'audit_only',
  DISABLED = 'disabled',
  WARNING_ONLY = 'warning_only',
}

/**
 * Security settings
 */
export interface SecuritySettings {
  /** Firewall settings */
  firewallSettings: FirewallSettings;

  /** Antivirus settings */
  antivirusSettings: AntivirusSettings;

  /** Encryption settings */
  encryptionSettings: EncryptionSettings;

  /** Access control settings */
  accessControlSettings: AccessControlSettings;

  /** Audit settings */
  auditSettings: AuditSettings;
}

/**
 * Firewall settings
 */
export interface FirewallSettings {
  /** Firewall enabled */
  enabled: boolean;

  /** Firewall rules */
  rules: FirewallRule[];

  /** Default policy */
  defaultPolicy: FirewallPolicy;

  /** Logging enabled */
  loggingEnabled: boolean;
}

/**
 * Firewall rule
 */
export interface FirewallRule {
  /** Rule identifier */
  ruleId: string;

  /** Source address */
  sourceAddress: string;

  /** Destination address */
  destinationAddress: string;

  /** Port range */
  portRange: string;

  /** Protocol */
  protocol: string;

  /** Action */
  action: FirewallAction;
}

/**
 * Firewall policies
 */
export enum FirewallPolicy {
  ALLOW = 'allow',
  DENY = 'deny',
  LOG = 'log',
}

/**
 * Firewall actions
 */
export enum FirewallAction {
  ALLOW = 'allow',
  DENY = 'deny',
  DROP = 'drop',
  REJECT = 'reject',
  LOG = 'log',
}

/**
 * Antivirus settings
 */
export interface AntivirusSettings {
  /** Antivirus enabled */
  enabled: boolean;

  /** Antivirus product */
  product: string;

  /** Version */
  version: string;

  /** Last update */
  lastUpdate: Date;

  /** Scan settings */
  scanSettings: ScanSettings;
}

/**
 * Scan settings
 */
export interface ScanSettings {
  /** Real-time scanning */
  realTimeScanning: boolean;

  /** Scheduled scanning */
  scheduledScanning: boolean;

  /** Scan frequency */
  scanFrequency: string;

  /** Quarantine enabled */
  quarantineEnabled: boolean;
}

/**
 * Encryption settings
 */
export interface EncryptionSettings {
  /** Disk encryption */
  diskEncryption: DiskEncryptionSettings;

  /** Network encryption */
  networkEncryption: NetworkEncryptionSettings;

  /** Database encryption */
  databaseEncryption: DatabaseEncryptionSettings;
}

/**
 * Disk encryption settings
 */
export interface DiskEncryptionSettings {
  /** Encryption enabled */
  enabled: boolean;

  /** Encryption algorithm */
  algorithm: string;

  /** Key length */
  keyLength: number;

  /** Encrypted volumes */
  encryptedVolumes: string[];
}

/**
 * Network encryption settings
 */
export interface NetworkEncryptionSettings {
  /** TLS version */
  tlsVersion: string;

  /** Cipher suites */
  cipherSuites: string[];

  /** Certificate validation */
  certificateValidation: boolean;
}

/**
 * Database encryption settings
 */
export interface DatabaseEncryptionSettings {
  /** Transparent data encryption */
  transparentDataEncryption: boolean;

  /** Column-level encryption */
  columnLevelEncryption: boolean;

  /** Backup encryption */
  backupEncryption: boolean;
}

/**
 * Access control settings
 */
export interface AccessControlSettings {
  /** Authentication methods */
  authenticationMethods: string[];

  /** Multi-factor authentication */
  multiFactorAuthentication: boolean;

  /** Password policy */
  passwordPolicy: PasswordPolicy;

  /** Account lockout policy */
  accountLockoutPolicy: AccountLockoutPolicy;
}

/**
 * Password policy
 */
export interface PasswordPolicy {
  /** Minimum length */
  minimumLength: number;

  /** Complexity requirements */
  complexityRequirements: string[];

  /** Password history */
  passwordHistory: number;

  /** Maximum age */
  maximumAge: number;
}

/**
 * Account lockout policy
 */
export interface AccountLockoutPolicy {
  /** Lockout threshold */
  lockoutThreshold: number;

  /** Lockout duration */
  lockoutDuration: number;

  /** Reset account lockout counter */
  resetAccountLockoutCounter: number;
}

/**
 * Audit settings
 */
export interface AuditSettings {
  /** Audit enabled */
  enabled: boolean;

  /** Audit level */
  auditLevel: string;

  /** Audit retention */
  retentionPeriod: number;

  /** Audit storage location */
  storageLocation: string;
}

/**
 * Network information
 */
export interface NetworkInfo {
  /** Network topology */
  networkTopology: NetworkTopology;

  /** Active connections */
  activeConnections: NetworkConnection[];

  /** Network configuration */
  networkConfiguration: NetworkConfiguration;

  /** Network security */
  networkSecurity: NetworkSecurity;
}

/**
 * Network topology
 */
export interface NetworkTopology {
  /** Network segments */
  networkSegments: NetworkSegment[];

  /** Routing information */
  routingInformation: RoutingInfo[];

  /** DNS configuration */
  dnsConfiguration: DnsConfiguration;

  /** DHCP configuration */
  dhcpConfiguration: DhcpConfiguration;
}

/**
 * Network segment
 */
export interface NetworkSegment {
  /** Segment identifier */
  segmentId: string;

  /** Segment name */
  name: string;

  /** Network address */
  networkAddress: string;

  /** Subnet mask */
  subnetMask: string;

  /** VLAN ID */
  vlanId?: number;

  /** Security zone */
  securityZone: string;
}

/**
 * Routing information
 */
export interface RoutingInfo {
  /** Destination network */
  destinationNetwork: string;

  /** Gateway */
  gateway: string;

  /** Interface */
  interface: string;

  /** Metric */
  metric: number;

  /** Route type */
  routeType: RouteType;
}

/**
 * Route types
 */
export enum RouteType {
  STATIC = 'static',
  DYNAMIC = 'dynamic',
  DEFAULT = 'default',
  HOST = 'host',
  NETWORK = 'network',
}

/**
 * DNS configuration
 */
export interface DnsConfiguration {
  /** Primary DNS server */
  primaryDnsServer: string;

  /** Secondary DNS servers */
  secondaryDnsServers: string[];

  /** DNS domain */
  dnsDomain: string;

  /** DNS search domains */
  searchDomains: string[];
}

/**
 * DHCP configuration
 */
export interface DhcpConfiguration {
  /** DHCP enabled */
  enabled: boolean;

  /** DHCP server */
  dhcpServer: string;

  /** Lease time */
  leaseTime: number;

  /** IP address range */
  ipAddressRange: IpAddressRange;
}

/**
 * IP address range
 */
export interface IpAddressRange {
  /** Start address */
  startAddress: string;

  /** End address */
  endAddress: string;

  /** Subnet mask */
  subnetMask: string;
}

/**
 * Network connection
 */
export interface NetworkConnection {
  /** Connection identifier */
  connectionId: string;

  /** Protocol */
  protocol: string;

  /** Local address */
  localAddress: string;

  /** Local port */
  localPort: number;

  /** Remote address */
  remoteAddress: string;

  /** Remote port */
  remotePort: number;

  /** Connection state */
  state: ConnectionState;

  /** Process ID */
  processId: number;

  /** Process name */
  processName: string;
}

/**
 * Connection states
 */
export enum ConnectionState {
  ESTABLISHED = 'established',
  LISTENING = 'listening',
  TIME_WAIT = 'time_wait',
  CLOSE_WAIT = 'close_wait',
  FIN_WAIT = 'fin_wait',
  SYN_SENT = 'syn_sent',
  SYN_RECEIVED = 'syn_received',
}

/**
 * Network configuration
 */
export interface NetworkConfiguration {
  /** Network interfaces */
  networkInterfaces: NetworkInterface[];

  /** Static routes */
  staticRoutes: StaticRoute[];

  /** Network services */
  networkServices: NetworkService[];

  /** Quality of service */
  qualityOfService: QosConfiguration;
}

/**
 * Static route
 */
export interface StaticRoute {
  /** Destination */
  destination: string;

  /** Gateway */
  gateway: string;

  /** Interface */
  interface: string;

  /** Metric */
  metric: number;
}

/**
 * Network service
 */
export interface NetworkService {
  /** Service name */
  serviceName: string;

  /** Port */
  port: number;

  /** Protocol */
  protocol: string;

  /** Service status */
  status: ServiceStatus;

  /** Configuration */
  configuration: Record<string, unknown>;
}

/**
 * Service status
 */
export enum ServiceStatus {
  RUNNING = 'running',
  STOPPED = 'stopped',
  STARTING = 'starting',
  STOPPING = 'stopping',
  FAILED = 'failed',
}

/**
 * QoS configuration
 */
export interface QosConfiguration {
  /** QoS enabled */
  enabled: boolean;

  /** Traffic classes */
  trafficClasses: TrafficClass[];

  /** Bandwidth policies */
  bandwidthPolicies: BandwidthPolicy[];
}

/**
 * Traffic class
 */
export interface TrafficClass {
  /** Class name */
  className: string;

  /** Priority */
  priority: number;

  /** Traffic selectors */
  trafficSelectors: TrafficSelector[];

  /** Actions */
  actions: QosAction[];
}

/**
 * Traffic selector
 */
export interface TrafficSelector {
  /** Selector type */
  selectorType: SelectorType;

  /** Selector value */
  selectorValue: string;

  /** Match criteria */
  matchCriteria: MatchCriteria;
}

/**
 * Selector types
 */
export enum SelectorType {
  SOURCE_IP = 'source_ip',
  DESTINATION_IP = 'destination_ip',
  SOURCE_PORT = 'source_port',
  DESTINATION_PORT = 'destination_port',
  PROTOCOL = 'protocol',
  DSCP = 'dscp',
  APPLICATION = 'application',
}

/**
 * Match criteria
 */
export enum MatchCriteria {
  EXACT = 'exact',
  PREFIX = 'prefix',
  RANGE = 'range',
  REGEX = 'regex',
  WILDCARD = 'wildcard',
}

/**
 * QoS action
 */
export interface QosAction {
  /** Action type */
  actionType: QosActionType;

  /** Action parameters */
  parameters: Record<string, unknown>;
}

/**
 * QoS action types
 */
export enum QosActionType {
  SET_PRIORITY = 'set_priority',
  LIMIT_BANDWIDTH = 'limit_bandwidth',
  GUARANTEE_BANDWIDTH = 'guarantee_bandwidth',
  DROP_PACKET = 'drop_packet',
  MARK_PACKET = 'mark_packet',
}

/**
 * Bandwidth policy
 */
export interface BandwidthPolicy {
  /** Policy name */
  policyName: string;

  /** Interface */
  interface: string;

  /** Direction */
  direction: TrafficDirection;

  /** Bandwidth limit */
  bandwidthLimit: number;

  /** Burst size */
  burstSize: number;
}

/**
 * Traffic direction
 */
export enum TrafficDirection {
  INGRESS = 'ingress',
  EGRESS = 'egress',
  BIDIRECTIONAL = 'bidirectional',
}

/**
 * Network security
 */
export interface NetworkSecurity {
  /** Security protocols */
  securityProtocols: SecurityProtocol[];

  /** Intrusion detection */
  intrusionDetection: IntrusionDetectionConfig;

  /** VPN configuration */
  vpnConfiguration: VpnConfiguration;

  /** Network monitoring */
  networkMonitoring: NetworkMonitoringConfig;
}

/**
 * Security protocol
 */
export interface SecurityProtocol {
  /** Protocol name */
  protocolName: string;

  /** Protocol version */
  version: string;

  /** Configuration */
  configuration: Record<string, unknown>;

  /** Status */
  status: ProtocolStatus;
}

/**
 * Protocol status
 */
export enum ProtocolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  NEGOTIATING = 'negotiating',
  FAILED = 'failed',
}

/**
 * Intrusion detection configuration
 */
export interface IntrusionDetectionConfig {
  /** IDS enabled */
  enabled: boolean;

  /** Detection methods */
  detectionMethods: DetectionMethod[];

  /** Signature database */
  signatureDatabase: SignatureDatabase;

  /** Response actions */
  responseActions: IdsResponseAction[];
}

/**
 * Detection method
 */
export interface DetectionMethod {
  /** Method name */
  methodName: string;

  /** Method type */
  methodType: DetectionMethodType;

  /** Configuration */
  configuration: Record<string, unknown>;

  /** Enabled */
  enabled: boolean;
}

/**
 * Detection method types
 */
export enum DetectionMethodType {
  SIGNATURE_BASED = 'signature_based',
  ANOMALY_BASED = 'anomaly_based',
  BEHAVIOR_BASED = 'behavior_based',
  HEURISTIC = 'heuristic',
  MACHINE_LEARNING = 'machine_learning',
}

/**
 * Signature database
 */
export interface SignatureDatabase {
  /** Database version */
  version: string;

  /** Last update */
  lastUpdate: Date;

  /** Signature count */
  signatureCount: number;

  /** Update source */
  updateSource: string;
}

/**
 * IDS response action
 */
export interface IdsResponseAction {
  /** Action name */
  actionName: string;

  /** Action type */
  actionType: IdsActionType;

  /** Trigger conditions */
  triggerConditions: TriggerCondition[];

  /** Action parameters */
  parameters: Record<string, unknown>;
}

/**
 * IDS action types
 */
export enum IdsActionType {
  ALERT = 'alert',
  BLOCK_CONNECTION = 'block_connection',
  QUARANTINE_HOST = 'quarantine_host',
  LOG_EVENT = 'log_event',
  NOTIFY_ADMINISTRATOR = 'notify_administrator',
  EXECUTE_SCRIPT = 'execute_script',
}

/**
 * Trigger condition
 */
export interface TriggerCondition {
  /** Condition type */
  conditionType: ConditionType;

  /** Condition value */
  value: string;

  /** Operator */
  operator: ConditionOperator;
}

/**
 * Condition types
 */
export enum ConditionType {
  SEVERITY = 'severity',
  SOURCE_IP = 'source_ip',
  DESTINATION_IP = 'destination_ip',
  PROTOCOL = 'protocol',
  SIGNATURE_ID = 'signature_id',
  FREQUENCY = 'frequency',
}

/**
 * Condition operators
 */
export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  MATCHES = 'matches',
}

/**
 * VPN configuration
 */
export interface VpnConfiguration {
  /** VPN enabled */
  enabled: boolean;

  /** VPN type */
  vpnType: VpnType;

  /** VPN endpoints */
  endpoints: VpnEndpoint[];

  /** Encryption settings */
  encryptionSettings: VpnEncryptionSettings;

  /** Authentication settings */
  authenticationSettings: VpnAuthenticationSettings;
}

/**
 * VPN types
 */
export enum VpnType {
  SITE_TO_SITE = 'site_to_site',
  REMOTE_ACCESS = 'remote_access',
  CLIENT_TO_SITE = 'client_to_site',
  SSL_VPN = 'ssl_vpn',
  IPSEC_VPN = 'ipsec_vpn',
}

/**
 * VPN endpoint
 */
export interface VpnEndpoint {
  /** Endpoint identifier */
  endpointId: string;

  /** Endpoint address */
  address: string;

  /** Endpoint type */
  endpointType: EndpointType;

  /** Connection status */
  connectionStatus: ConnectionStatus;

  /** Configuration */
  configuration: Record<string, unknown>;
}

/**
 * Endpoint types
 */
export enum EndpointType {
  GATEWAY = 'gateway',
  CLIENT = 'client',
  PEER = 'peer',
  SERVER = 'server',
}

/**
 * Connection status
 */
export enum ConnectionStatus {
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  FAILED = 'failed',
  SUSPENDED = 'suspended',
}

/**
 * VPN encryption settings
 */
export interface VpnEncryptionSettings {
  /** Encryption algorithm */
  encryptionAlgorithm: string;

  /** Key length */
  keyLength: number;

  /** Hash algorithm */
  hashAlgorithm: string;

  /** Perfect forward secrecy */
  perfectForwardSecrecy: boolean;
}

/**
 * VPN authentication settings
 */
export interface VpnAuthenticationSettings {
  /** Authentication method */
  authenticationMethod: VpnAuthenticationMethod;

  /** Pre-shared key */
  preSharedKey?: string;

  /** Certificate authority */
  certificateAuthority?: string;

  /** User authentication */
  userAuthentication: UserAuthenticationConfig;
}

/**
 * VPN authentication methods
 */
export enum VpnAuthenticationMethod {
  PRE_SHARED_KEY = 'pre_shared_key',
  CERTIFICATE = 'certificate',
  KERBEROS = 'kerberos',
  RADIUS = 'radius',
  LDAP = 'ldap',
}

/**
 * User authentication configuration
 */
export interface UserAuthenticationConfig {
  /** Authentication required */
  required: boolean;

  /** Authentication method */
  method: string;

  /** User database */
  userDatabase: string;

  /** Multi-factor authentication */
  multiFactorAuth: boolean;
}

/**
 * Network monitoring configuration
 */
export interface NetworkMonitoringConfig {
  /** Monitoring enabled */
  enabled: boolean;

  /** Monitoring tools */
  monitoringTools: MonitoringTool[];

  /** Traffic analysis */
  trafficAnalysis: TrafficAnalysisConfig;

  /** Performance monitoring */
  performanceMonitoring: NetworkPerformanceMonitoring;
}

/**
 * Monitoring tool
 */
export interface MonitoringTool {
  /** Tool name */
  toolName: string;

  /** Tool version */
  version: string;

  /** Configuration */
  configuration: Record<string, unknown>;

  /** Status */
  status: ToolStatus;
}

/**
 * Tool status
 */
export enum ToolStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ERROR = 'error',
  MAINTENANCE = 'maintenance',
}

/**
 * Traffic analysis configuration
 */
export interface TrafficAnalysisConfig {
  /** Deep packet inspection */
  deepPacketInspection: boolean;

  /** Flow analysis */
  flowAnalysis: boolean;

  /** Protocol analysis */
  protocolAnalysis: ProtocolAnalysisConfig;

  /** Behavioral analysis */
  behavioralAnalysis: BehavioralAnalysisConfig;
}

/**
 * Protocol analysis configuration
 */
export interface ProtocolAnalysisConfig {
  /** Analyzed protocols */
  analyzedProtocols: string[];

  /** Protocol decoding */
  protocolDecoding: boolean;

  /** Anomaly detection */
  anomalyDetection: boolean;
}

/**
 * Behavioral analysis configuration
 */
export interface BehavioralAnalysisConfig {
  /** Baseline period */
  baselinePeriod: number;

  /** Deviation threshold */
  deviationThreshold: number;

  /** Learning mode */
  learningMode: boolean;

  /** Alert threshold */
  alertThreshold: number;
}

/**
 * Network performance monitoring
 */
export interface NetworkPerformanceMonitoring {
  /** Bandwidth monitoring */
  bandwidthMonitoring: boolean;

  /** Latency monitoring */
  latencyMonitoring: boolean;

  /** Packet loss monitoring */
  packetLossMonitoring: boolean;

  /** Jitter monitoring */
  jitterMonitoring: boolean;

  /** Performance thresholds */
  performanceThresholds: PerformanceThreshold[];
}

/**
 * Performance threshold
 */
export interface PerformanceThreshold {
  /** Metric name */
  metricName: string;

  /** Threshold value */
  thresholdValue: number;

  /** Comparison operator */
  operator: ThresholdOperator;

  /** Alert severity */
  alertSeverity: AuditEventSeverity;
}

/**
 * Threshold operators
 */
export enum ThresholdOperator {
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN_OR_EQUAL = 'greater_than_or_equal',
  LESS_THAN_OR_EQUAL = 'less_than_or_equal',
}

/**
 * Security context
 */
export interface SecurityContext {
  /** Security level */
  securityLevel: string;

  /** Threat level */
  threatLevel: ThreatLevel;

  /** Security controls */
  securityControls: SecurityControl[];

  /** Incident status */
  incidentStatus: IncidentStatus;

  /** Compliance status */
  complianceStatus: ComplianceStatus;
}

/**
 * Threat levels
 */
export enum ThreatLevel {
  LOW = 'low',
  MODERATE = 'moderate',
  HIGH = 'high',
  SEVERE = 'severe',
  CRITICAL = 'critical',
}

/**
 * Security control
 */
export interface SecurityControl {
  /** Control identifier */
  controlId: string;

  /** Control name */
  name: string;

  /** Control type */
  controlType: SecurityControlType;

  /** Implementation status */
  implementationStatus: ImplementationStatus;

  /** Effectiveness rating */
  effectivenessRating: EffectivenessRating;
}

/**
 * Security control types
 */
export enum SecurityControlType {
  PREVENTIVE = 'preventive',
  DETECTIVE = 'detective',
  CORRECTIVE = 'corrective',
  COMPENSATING = 'compensating',
  DETERRENT = 'deterrent',
  RECOVERY = 'recovery',
}

/**
 * Implementation status
 */
export enum ImplementationStatus {
  NOT_IMPLEMENTED = 'not_implemented',
  PARTIALLY_IMPLEMENTED = 'partially_implemented',
  FULLY_IMPLEMENTED = 'fully_implemented',
  NOT_APPLICABLE = 'not_applicable',
}

/**
 * Effectiveness rating
 */
export enum EffectivenessRating {
  INEFFECTIVE = 'ineffective',
  PARTIALLY_EFFECTIVE = 'partially_effective',
  EFFECTIVE = 'effective',
  HIGHLY_EFFECTIVE = 'highly_effective',
}

/**
 * Incident status
 */
export interface IncidentStatus {
  /** Active incidents */
  activeIncidents: number;

  /** Incident severity */
  highestSeverity: AuditEventSeverity;

  /** Last incident */
  lastIncidentTimestamp?: Date;

  /** Response status */
  responseStatus: ResponseStatus;
}

/**
 * Response status
 */
export enum ResponseStatus {
  NORMAL = 'normal',
  ALERT = 'alert',
  RESPONSE_ACTIVE = 'response_active',
  RECOVERY = 'recovery',
  POST_INCIDENT = 'post_incident',
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  /** Overall compliance score */
  overallScore: number;

  /** Framework compliance */
  frameworkCompliance: FrameworkCompliance[];

  /** Last assessment */
  lastAssessment: Date;

  /** Next assessment due */
  nextAssessmentDue: Date;
}

/**
 * Framework compliance
 */
export interface FrameworkCompliance {
  /** Framework name */
  frameworkName: string;

  /** Compliance score */
  complianceScore: number;

  /** Status */
  status: FrameworkComplianceStatus;

  /** Last assessment */
  lastAssessment: Date;
}

/**
 * Framework compliance status
 */
export enum FrameworkComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  UNDER_REVIEW = 'under_review',
  NOT_ASSESSED = 'not_assessed',
}

/**
 * Environmental conditions
 */
export interface EnvironmentalConditions {
  /** Physical location */
  physicalLocation: PhysicalLocation;

  /** Environmental monitoring */
  environmentalMonitoring: EnvironmentalMonitoring;

  /** Power status */
  powerStatus: PowerStatus;

  /** Cooling status */
  coolingStatus: CoolingStatus;

  /** Access controls */
  accessControls: PhysicalAccessControl[];
}

/**
 * Physical location
 */
export interface PhysicalLocation {
  /** Building */
  building: string;

  /** Floor */
  floor: string;

  /** Room */
  room: string;

  /** Rack */
  rack?: string;

  /** GPS coordinates */
  gpsCoordinates: GpsCoordinates;

  /** Address */
  address: Address;
}

/**
 * GPS coordinates
 */
export interface GpsCoordinates {
  /** Latitude */
  latitude: number;

  /** Longitude */
  longitude: number;

  /** Altitude */
  altitude?: number;

  /** Accuracy */
  accuracy: number;
}

/**
 * Address
 */
export interface Address {
  /** Street address */
  streetAddress: string;

  /** City */
  city: string;

  /** State/Province */
  stateProvince: string;

  /** Postal code */
  postalCode: string;

  /** Country */
  country: string;
}

/**
 * Environmental monitoring
 */
export interface EnvironmentalMonitoring {
  /** Temperature */
  temperature: TemperatureReading;

  /** Humidity */
  humidity: HumidityReading;

  /** Air quality */
  airQuality: AirQualityReading;

  /** Vibration */
  vibration: VibrationReading;

  /** Noise level */
  noiseLevel: NoiseLevelReading;
}

/**
 * Temperature reading
 */
export interface TemperatureReading {
  /** Current temperature */
  currentTemperature: number;

  /** Unit */
  unit: TemperatureUnit;

  /** Timestamp */
  timestamp: Date;

  /** Sensor location */
  sensorLocation: string;

  /** Alert thresholds */
  alertThresholds: TemperatureThreshold[];
}

/**
 * Temperature units
 */
export enum TemperatureUnit {
  CELSIUS = 'celsius',
  FAHRENHEIT = 'fahrenheit',
  KELVIN = 'kelvin',
}

/**
 * Temperature threshold
 */
export interface TemperatureThreshold {
  /** Threshold type */
  thresholdType: TemperatureThresholdType;

  /** Threshold value */
  value: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Temperature threshold types
 */
export enum TemperatureThresholdType {
  LOW_WARNING = 'low_warning',
  LOW_CRITICAL = 'low_critical',
  HIGH_WARNING = 'high_warning',
  HIGH_CRITICAL = 'high_critical',
}

/**
 * Humidity reading
 */
export interface HumidityReading {
  /** Relative humidity percentage */
  relativeHumidity: number;

  /** Timestamp */
  timestamp: Date;

  /** Sensor location */
  sensorLocation: string;

  /** Alert thresholds */
  alertThresholds: HumidityThreshold[];
}

/**
 * Humidity threshold
 */
export interface HumidityThreshold {
  /** Threshold type */
  thresholdType: HumidityThresholdType;

  /** Threshold value */
  value: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Humidity threshold types
 */
export enum HumidityThresholdType {
  LOW_WARNING = 'low_warning',
  LOW_CRITICAL = 'low_critical',
  HIGH_WARNING = 'high_warning',
  HIGH_CRITICAL = 'high_critical',
}

/**
 * Air quality reading
 */
export interface AirQualityReading {
  /** Air quality index */
  airQualityIndex: number;

  /** Particulate matter */
  particulateMatter: ParticulateMatterReading;

  /** Chemical contaminants */
  chemicalContaminants: ChemicalContaminant[];

  /** Timestamp */
  timestamp: Date;

  /** Sensor location */
  sensorLocation: string;
}

/**
 * Particulate matter reading
 */
export interface ParticulateMatterReading {
  /** PM2.5 level */
  pm25Level: number;

  /** PM10 level */
  pm10Level: number;

  /** Unit */
  unit: string;

  /** Alert thresholds */
  alertThresholds: ParticulateThreshold[];
}

/**
 * Particulate threshold
 */
export interface ParticulateThreshold {
  /** Particle size */
  particleSize: string;

  /** Threshold value */
  value: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Chemical contaminant
 */
export interface ChemicalContaminant {
  /** Chemical name */
  chemicalName: string;

  /** Concentration */
  concentration: number;

  /** Unit */
  unit: string;

  /** Danger level */
  dangerLevel: DangerLevel;
}

/**
 * Danger levels
 */
export enum DangerLevel {
  SAFE = 'safe',
  CAUTION = 'caution',
  WARNING = 'warning',
  DANGER = 'danger',
  EXTREME_DANGER = 'extreme_danger',
}

/**
 * Vibration reading
 */
export interface VibrationReading {
  /** Vibration amplitude */
  amplitude: number;

  /** Frequency */
  frequency: number;

  /** Unit */
  unit: string;

  /** Timestamp */
  timestamp: Date;

  /** Sensor location */
  sensorLocation: string;

  /** Alert thresholds */
  alertThresholds: VibrationThreshold[];
}

/**
 * Vibration threshold
 */
export interface VibrationThreshold {
  /** Threshold type */
  thresholdType: VibrationThresholdType;

  /** Threshold value */
  value: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Vibration threshold types
 */
export enum VibrationThresholdType {
  AMPLITUDE_HIGH = 'amplitude_high',
  FREQUENCY_HIGH = 'frequency_high',
  AMPLITUDE_LOW = 'amplitude_low',
  FREQUENCY_LOW = 'frequency_low',
}

/**
 * Noise level reading
 */
export interface NoiseLevelReading {
  /** Noise level in decibels */
  decibelLevel: number;

  /** Frequency spectrum */
  frequencySpectrum: FrequencySpectrum[];

  /** Timestamp */
  timestamp: Date;

  /** Sensor location */
  sensorLocation: string;

  /** Alert thresholds */
  alertThresholds: NoiseThreshold[];
}

/**
 * Frequency spectrum
 */
export interface FrequencySpectrum {
  /** Frequency */
  frequency: number;

  /** Amplitude */
  amplitude: number;

  /** Unit */
  unit: string;
}

/**
 * Noise threshold
 */
export interface NoiseThreshold {
  /** Threshold value */
  value: number;

  /** Duration */
  duration: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Power status
 */
export interface PowerStatus {
  /** Power source */
  powerSource: PowerSource;

  /** Power quality */
  powerQuality: PowerQuality;

  /** UPS status */
  upsStatus: UpsStatus;

  /** Power consumption */
  powerConsumption: PowerConsumption;
}

/**
 * Power source
 */
export interface PowerSource {
  /** Primary source */
  primarySource: string;

  /** Backup sources */
  backupSources: string[];

  /** Current source */
  currentSource: string;

  /** Source status */
  sourceStatus: PowerSourceStatus;
}

/**
 * Power source status
 */
export enum PowerSourceStatus {
  NORMAL = 'normal',
  BACKUP = 'backup',
  BATTERY = 'battery',
  GENERATOR = 'generator',
  FAILED = 'failed',
}

/**
 * Power quality
 */
export interface PowerQuality {
  /** Voltage */
  voltage: VoltageReading;

  /** Current */
  current: CurrentReading;

  /** Frequency */
  frequency: FrequencyReading;

  /** Power factor */
  powerFactor: number;

  /** Harmonics */
  harmonics: HarmonicReading[];
}

/**
 * Voltage reading
 */
export interface VoltageReading {
  /** Voltage value */
  value: number;

  /** Unit */
  unit: string;

  /** Timestamp */
  timestamp: Date;

  /** Phase */
  phase: string;

  /** Alert thresholds */
  alertThresholds: VoltageThreshold[];
}

/**
 * Voltage threshold
 */
export interface VoltageThreshold {
  /** Threshold type */
  thresholdType: VoltageThresholdType;

  /** Threshold value */
  value: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Voltage threshold types
 */
export enum VoltageThresholdType {
  OVER_VOLTAGE = 'over_voltage',
  UNDER_VOLTAGE = 'under_voltage',
  SURGE = 'surge',
  SAG = 'sag',
}

/**
 * Current reading
 */
export interface CurrentReading {
  /** Current value */
  value: number;

  /** Unit */
  unit: string;

  /** Timestamp */
  timestamp: Date;

  /** Phase */
  phase: string;

  /** Alert thresholds */
  alertThresholds: CurrentThreshold[];
}

/**
 * Current threshold
 */
export interface CurrentThreshold {
  /** Threshold type */
  thresholdType: CurrentThresholdType;

  /** Threshold value */
  value: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Current threshold types
 */
export enum CurrentThresholdType {
  OVER_CURRENT = 'over_current',
  UNDER_CURRENT = 'under_current',
  IMBALANCE = 'imbalance',
}

/**
 * Frequency reading
 */
export interface FrequencyReading {
  /** Frequency value */
  value: number;

  /** Unit */
  unit: string;

  /** Timestamp */
  timestamp: Date;

  /** Alert thresholds */
  alertThresholds: FrequencyThreshold[];
}

/**
 * Frequency threshold
 */
export interface FrequencyThreshold {
  /** Threshold type */
  thresholdType: FrequencyThresholdType;

  /** Threshold value */
  value: number;

  /** Alert level */
  alertLevel: AuditEventSeverity;
}

/**
 * Frequency threshold types
 */
export enum FrequencyThresholdType {
  HIGH_FREQUENCY = 'high_frequency',
  LOW_FREQUENCY = 'low_frequency',
  DEVIATION = 'deviation',
}

/**
 * Harmonic reading
 */
export interface HarmonicReading {
  /** Harmonic order */
  order: number;

  /** Magnitude */
  magnitude: number;

  /** Phase angle */
  phaseAngle: number;

  /** Distortion percentage */
  distortionPercentage: number;
}

/**
 * UPS status
 */
export interface UpsStatus {
  /** UPS present */
  present: boolean;

  /** Battery level */
  batteryLevel: number;

  /** Runtime remaining */
  runtimeRemaining: number;

  /** UPS mode */
  mode: UpsMode;

  /** UPS health */
  health: UpsHealth;
}

/**
 * UPS modes
 */
export enum UpsMode {
  ONLINE = 'online',
  BATTERY = 'battery',
  BYPASS = 'bypass',
  OFF = 'off',
  TEST = 'test',
}

/**
 * UPS health
 */
export enum UpsHealth {
  GOOD = 'good',
  WARNING = 'warning',
  REPLACE_BATTERY = 'replace_battery',
  REPLACE_UPS = 'replace_ups',
  FAILED = 'failed',
}

/**
 * Power consumption
 */
export interface PowerConsumption {
  /** Current consumption */
  currentConsumption: number;

  /** Average consumption */
  averageConsumption: number;

  /** Peak consumption */
  peakConsumption: number;

  /** Unit */
  unit: string;

  /** Timestamp */
  timestamp: Date;

  /** Consumption history */
  consumptionHistory: ConsumptionHistoryEntry[];
}

/**
 * Consumption history entry
 */
export interface ConsumptionHistoryEntry {
  /** Timestamp */
  timestamp: Date;

  /** Consumption value */
  consumption: number;

  /** Duration */
  duration: number;
}

/**
 * Cooling status
 */
export interface CoolingStatus {
  /** Cooling system type */
  systemType: CoolingSystemType;

  /** Cooling capacity */
  coolingCapacity: CoolingCapacity;

  /** System status */
  systemStatus: CoolingSystemStatus;

  /** Performance metrics */
  performanceMetrics: CoolingPerformanceMetrics;
}

/**
 * Cooling system types
 */
export enum CoolingSystemType {
  AIR_CONDITIONING = 'air_conditioning',
  LIQUID_COOLING = 'liquid_cooling',
  NATURAL_CONVECTION = 'natural_convection',
  FORCED_AIR = 'forced_air',
  IMMERSION_COOLING = 'immersion_cooling',
}

/**
 * Cooling capacity
 */
export interface CoolingCapacity {
  /** Rated capacity */
  ratedCapacity: number;

  /** Current capacity */
  currentCapacity: number;

  /** Unit */
  unit: string;

  /** Efficiency rating */
  efficiencyRating: number;
}

/**
 * Cooling system status
 */
export enum CoolingSystemStatus {
  OPERATING = 'operating',
  STANDBY = 'standby',
  MAINTENANCE = 'maintenance',
  FAILED = 'failed',
  OFFLINE = 'offline',
}

/**
 * Cooling performance metrics
 */
export interface CoolingPerformanceMetrics {
  /** Inlet temperature */
  inletTemperature: number;

  /** Outlet temperature */
  outletTemperature: number;

  /** Temperature differential */
  temperatureDifferential: number;

  /** Flow rate */
  flowRate: number;

  /** Energy consumption */
  energyConsumption: number;

  /** Efficiency */
  efficiency: number;
}

/**
 * Physical access control
 */
export interface PhysicalAccessControl {
  /** Access control type */
  controlType: AccessControlType;

  /** Authentication methods */
  authenticationMethods: PhysicalAuthenticationMethod[];

  /** Access log */
  accessLog: AccessLogEntry[];

  /** Control status */
  controlStatus: AccessControlStatus;
}

/**
 * Access control types
 */
export enum AccessControlType {
  CARD_READER = 'card_reader',
  BIOMETRIC_SCANNER = 'biometric_scanner',
  KEYPAD = 'keypad',
  SECURITY_GUARD = 'security_guard',
  CAMERA_SYSTEM = 'camera_system',
  MOTION_DETECTOR = 'motion_detector',
}

/**
 * Physical authentication methods
 */
export enum PhysicalAuthenticationMethod {
  RFID_CARD = 'rfid_card',
  MAGNETIC_STRIPE = 'magnetic_stripe',
  FINGERPRINT = 'fingerprint',
  RETINA_SCAN = 'retina_scan',
  FACE_RECOGNITION = 'face_recognition',
  PIN_CODE = 'pin_code',
  KEY = 'key',
}

/**
 * Access log entry
 */
export interface AccessLogEntry {
  /** Entry timestamp */
  timestamp: Date;

  /** Person identifier */
  personId: string;

  /** Access result */
  accessResult: AccessResult;

  /** Authentication method used */
  authenticationMethod: PhysicalAuthenticationMethod;

  /** Entry point */
  entryPoint: string;

  /** Duration */
  duration?: number;
}

/**
 * Access results
 */
export enum AccessResult {
  GRANTED = 'granted',
  DENIED = 'denied',
  FORCED_ENTRY = 'forced_entry',
  TAILGATING = 'tailgating',
  EMERGENCY_OVERRIDE = 'emergency_override',
}

/**
 * Access control status
 */
export enum AccessControlStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  BYPASSED = 'bypassed',
  FAILED = 'failed',
}

// Continue with remaining types in next part...

export * from './forensic-evidence.service';