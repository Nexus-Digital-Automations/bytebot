/**
 * Advanced Network Scanner Implementation
 * Provides comprehensive network discovery, port scanning, and service enumeration
 */

import { EventEmitter } from 'events';
import * as nmap from 'node-nmap';
import * as ping from 'ping';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../utils/Logger';
import {
  NetworkDevice,
  Port,
  Service,
  ScanConfiguration,
  ScanResult,
  ScanStatus,
  ScanStatistics,
  ScanType,
  DeviceType,
  VulnerabilitySeverity
} from '../types';

export class NetworkScanner extends EventEmitter {
  private readonly logger: Logger;
  private activeScan: string | null = null;
  private scanResults: Map<string, ScanResult> = new Map();

  constructor() {
    super();
    this.logger = new Logger('NetworkScanner');
  }

  /**
   * Start comprehensive network scan
   */
  public async startScan(config: ScanConfiguration): Promise<string> {
    const scanId = uuidv4();

    try {
      this.logger.info('Starting network scan', { scanId, config });

      if (this.activeScan) {
        throw new Error('Another scan is already in progress');
      }

      this.activeScan = scanId;

      const scanResult: ScanResult = {
        id: scanId,
        configuration: config,
        devices: [],
        statistics: this.initializeStatistics(),
        started_at: new Date(),
        completed_at: new Date(),
        duration: 0,
        status: ScanStatus.RUNNING,
        errors: []
      };

      this.scanResults.set(scanId, scanResult);
      this.emit('scanStarted', { scanId, config });

      // Execute scan based on type
      switch (config.scan_type) {
        case ScanType.PING_SWEEP:
          await this.performPingSweep(scanId, config);
          break;
        case ScanType.PORT_SCAN:
          await this.performPortScan(scanId, config);
          break;
        case ScanType.SERVICE_SCAN:
          await this.performServiceScan(scanId, config);
          break;
        case ScanType.VULNERABILITY_SCAN:
          await this.performVulnerabilityScan(scanId, config);
          break;
        case ScanType.COMPREHENSIVE:
          await this.performComprehensiveScan(scanId, config);
          break;
        default:
          throw new Error(`Unsupported scan type: ${config.scan_type}`);
      }

      // Complete scan
      const result = this.scanResults.get(scanId)!;
      result.completed_at = new Date();
      result.duration = result.completed_at.getTime() - result.started_at.getTime();
      result.status = ScanStatus.COMPLETED;

      this.activeScan = null;
      this.emit('scanCompleted', { scanId, result });

      this.logger.info('Network scan completed successfully', {
        scanId,
        duration: result.duration,
        devicesFound: result.devices.length
      });

      return scanId;

    } catch (error) {
      this.logger.error('Network scan failed', { scanId, error });

      const result = this.scanResults.get(scanId);
      if (result) {
        result.status = ScanStatus.FAILED;
        result.errors.push(error instanceof Error ? error.message : String(error));
        result.completed_at = new Date();
        result.duration = result.completed_at.getTime() - result.started_at.getTime();
      }

      this.activeScan = null;
      this.emit('scanFailed', { scanId, error });
      throw error;
    }
  }

  /**
   * Get scan results by ID
   */
  public getScanResult(scanId: string): ScanResult | null {
    return this.scanResults.get(scanId) || null;
  }

  /**
   * List all scan results
   */
  public listScanResults(): ScanResult[] {
    return Array.from(this.scanResults.values());
  }

  /**
   * Cancel active scan
   */
  public async cancelScan(): Promise<boolean> {
    if (!this.activeScan) {
      return false;
    }

    const scanId = this.activeScan;
    const result = this.scanResults.get(scanId);

    if (result) {
      result.status = ScanStatus.CANCELLED;
      result.completed_at = new Date();
      result.duration = result.completed_at.getTime() - result.started_at.getTime();
    }

    this.activeScan = null;
    this.emit('scanCancelled', { scanId });

    this.logger.info('Network scan cancelled', { scanId });
    return true;
  }

  /**
   * Perform ping sweep to discover live hosts
   */
  private async performPingSweep(scanId: string, config: ScanConfiguration): Promise<void> {
    this.logger.info('Performing ping sweep', { scanId, targets: config.target });

    const targets = Array.isArray(config.target) ? config.target : [config.target];
    const result = this.scanResults.get(scanId)!;

    for (const target of targets) {
      try {
        const hosts = await this.expandTargetRange(target);

        for (const host of hosts) {
          try {
            const pingResult = await ping.promise.probe(host, {
              timeout: config.timeout || 3,
              extra: ['-c', '1']
            });

            if (pingResult.alive) {
              const device: NetworkDevice = {
                ip: host,
                hostname: pingResult.host !== host ? pingResult.host : undefined,
                ports: [],
                services: [],
                vulnerabilities: [],
                lastSeen: new Date(),
                deviceType: DeviceType.UNKNOWN,
                security_score: 100
              };

              result.devices.push(device);
              result.statistics.hosts_up++;

              this.emit('hostDiscovered', { scanId, device });
              this.logger.debug('Host discovered', { scanId, host, responseTime: pingResult.time });
            }
          } catch (error) {
            this.logger.warn('Ping failed for host', { scanId, host, error });
          }
        }

        result.statistics.total_hosts = hosts.length;
      } catch (error) {
        result.errors.push(`Failed to process target ${target}: ${error}`);
        this.logger.error('Target processing failed', { scanId, target, error });
      }
    }
  }

  /**
   * Perform comprehensive port scanning
   */
  private async performPortScan(scanId: string, config: ScanConfiguration): Promise<void> {
    this.logger.info('Performing port scan', { scanId, targets: config.target });

    const targets = Array.isArray(config.target) ? config.target : [config.target];
    const result = this.scanResults.get(scanId)!;

    for (const target of targets) {
      try {
        const nmapOptions = this.buildNmapOptions(config);
        const scanResult = await this.executeNmapScan(target, nmapOptions);

        for (const host of scanResult) {
          const device = this.parseNmapHost(host);
          result.devices.push(device);

          result.statistics.total_ports_scanned += device.ports.length;
          result.statistics.open_ports += device.ports.filter(p => p.state === 'open').length;

          this.emit('deviceScanned', { scanId, device });
        }
      } catch (error) {
        result.errors.push(`Port scan failed for target ${target}: ${error}`);
        this.logger.error('Port scan failed', { scanId, target, error });
      }
    }
  }

  /**
   * Perform service enumeration and version detection
   */
  private async performServiceScan(scanId: string, config: ScanConfiguration): Promise<void> {
    this.logger.info('Performing service scan', { scanId, targets: config.target });

    // First perform port scan
    await this.performPortScan(scanId, config);

    const result = this.scanResults.get(scanId)!;

    // Then enhance with service detection
    for (const device of result.devices) {
      try {
        const services = await this.detectServices(device);
        device.services = services;
        result.statistics.services_detected += services.length;

        this.emit('servicesDetected', { scanId, device, services });
      } catch (error) {
        this.logger.warn('Service detection failed', { scanId, device: device.ip, error });
      }
    }
  }

  /**
   * Perform vulnerability scanning
   */
  private async performVulnerabilityScan(scanId: string, config: ScanConfiguration): Promise<void> {
    this.logger.info('Performing vulnerability scan', { scanId, targets: config.target });

    // First perform service scan
    await this.performServiceScan(scanId, config);

    const result = this.scanResults.get(scanId)!;

    // Then scan for vulnerabilities
    for (const device of result.devices) {
      try {
        const vulnerabilities = await this.scanVulnerabilities(device);
        device.vulnerabilities = vulnerabilities;
        device.security_score = this.calculateSecurityScore(device);

        result.statistics.vulnerabilities_found += vulnerabilities.length;

        this.emit('vulnerabilitiesFound', { scanId, device, vulnerabilities });
      } catch (error) {
        this.logger.warn('Vulnerability scan failed', { scanId, device: device.ip, error });
      }
    }
  }

  /**
   * Perform comprehensive scan (all scan types)
   */
  private async performComprehensiveScan(scanId: string, config: ScanConfiguration): Promise<void> {
    this.logger.info('Performing comprehensive scan', { scanId, targets: config.target });

    await this.performVulnerabilityScan(scanId, config);

    // Additional comprehensive analysis
    const result = this.scanResults.get(scanId)!;

    for (const device of result.devices) {
      // Device fingerprinting
      device.deviceType = await this.identifyDeviceType(device);

      // Enhanced OS detection
      if (!device.os) {
        device.os = await this.detectOperatingSystem(device);
      }

      this.emit('deviceAnalyzed', { scanId, device });
    }
  }

  /**
   * Build nmap command options
   */
  private buildNmapOptions(config: ScanConfiguration): any {
    const options: any = {
      range: [],
      ports: config.port_range || '1-65535',
      timeout: config.timeout || 30
    };

    // Scan timing
    switch (config.timing) {
      case 'paranoid':
        options.timing = 0;
        break;
      case 'sneaky':
        options.timing = 1;
        break;
      case 'polite':
        options.timing = 2;
        break;
      case 'normal':
        options.timing = 3;
        break;
      case 'aggressive':
        options.timing = 4;
        break;
      case 'insane':
        options.timing = 5;
        break;
    }

    // Additional options
    if (config.version_detection) {
      options.flags = (options.flags || []).concat('-sV');
    }

    if (config.os_detection) {
      options.flags = (options.flags || []).concat('-O');
    }

    if (config.script_scan) {
      options.flags = (options.flags || []).concat('-sC');
    }

    if (config.stealth_mode) {
      options.flags = (options.flags || []).concat('-sS');
    }

    return options;
  }

  /**
   * Execute nmap scan
   */
  private async executeNmapScan(target: string, options: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const nmapScan = new nmap.NmapScan(target, options);

      nmapScan.on('complete', (data) => {
        resolve(data);
      });

      nmapScan.on('error', (error) => {
        reject(error);
      });

      nmapScan.startScan();
    });
  }

  /**
   * Parse nmap host result
   */
  private parseNmapHost(hostData: any): NetworkDevice {
    const device: NetworkDevice = {
      ip: hostData.ip,
      hostname: hostData.hostname,
      mac: hostData.mac,
      vendor: hostData.vendor,
      os: hostData.osNmap,
      ports: [],
      services: [],
      vulnerabilities: [],
      lastSeen: new Date(),
      deviceType: DeviceType.UNKNOWN,
      security_score: 100
    };

    // Parse ports
    if (hostData.openPorts) {
      for (const portData of hostData.openPorts) {
        const port: Port = {
          number: parseInt(portData.port),
          protocol: portData.protocol || 'tcp',
          state: portData.state || 'open',
          service: portData.service,
          version: portData.version,
          banner: portData.product
        };

        device.ports.push(port);
      }
    }

    return device;
  }

  /**
   * Detect services on device
   */
  private async detectServices(device: NetworkDevice): Promise<Service[]> {
    const services: Service[] = [];

    for (const port of device.ports.filter(p => p.state === 'open')) {
      try {
        const service: Service = {
          name: port.service || 'unknown',
          port: port.number,
          protocol: port.protocol,
          version: port.version,
          state: 'running',
          vulnerabilities: [],
          configuration: {}
        };

        // Enhanced service detection
        if (port.service) {
          service.configuration = await this.getServiceConfiguration(device.ip, port);
        }

        services.push(service);
      } catch (error) {
        this.logger.warn('Service detection failed for port', {
          device: device.ip,
          port: port.number,
          error
        });
      }
    }

    return services;
  }

  /**
   * Scan for vulnerabilities
   */
  private async scanVulnerabilities(device: NetworkDevice): Promise<any[]> {
    const vulnerabilities: any[] = [];

    // Basic vulnerability checks based on services
    for (const service of device.services) {
      try {
        const serviceVulns = await this.checkServiceVulnerabilities(service);
        vulnerabilities.push(...serviceVulns);
      } catch (error) {
        this.logger.warn('Vulnerability check failed for service', {
          device: device.ip,
          service: service.name,
          error
        });
      }
    }

    return vulnerabilities;
  }

  /**
   * Check service-specific vulnerabilities
   */
  private async checkServiceVulnerabilities(service: Service): Promise<any[]> {
    const vulnerabilities: any[] = [];

    // Common vulnerability patterns
    const vulnChecks = [
      this.checkDefaultCredentials,
      this.checkKnownExploits,
      this.checkConfigurationIssues,
      this.checkOutdatedVersions
    ];

    for (const check of vulnChecks) {
      try {
        const vulns = await check.call(this, service);
        vulnerabilities.push(...vulns);
      } catch (error) {
        this.logger.debug('Vulnerability check failed', { service: service.name, error });
      }
    }

    return vulnerabilities;
  }

  /**
   * Calculate security score for device
   */
  private calculateSecurityScore(device: NetworkDevice): number {
    let score = 100;

    // Deduct points for vulnerabilities
    for (const vuln of device.vulnerabilities) {
      switch (vuln.severity) {
        case VulnerabilitySeverity.CRITICAL:
          score -= 25;
          break;
        case VulnerabilitySeverity.HIGH:
          score -= 15;
          break;
        case VulnerabilitySeverity.MEDIUM:
          score -= 10;
          break;
        case VulnerabilitySeverity.LOW:
          score -= 5;
          break;
      }
    }

    // Deduct points for open ports
    score -= device.ports.filter(p => p.state === 'open').length * 2;

    return Math.max(0, score);
  }

  /**
   * Identify device type based on characteristics
   */
  private async identifyDeviceType(device: NetworkDevice): Promise<DeviceType> {
    // Device fingerprinting logic
    const openPorts = device.ports.filter(p => p.state === 'open').map(p => p.number);

    // Router/Firewall detection
    if (openPorts.includes(23) || openPorts.includes(443) || openPorts.includes(8080)) {
      if (device.services.some(s => s.name.includes('http') || s.name.includes('web'))) {
        return DeviceType.ROUTER;
      }
    }

    // Server detection
    if (openPorts.includes(22) || openPorts.includes(3389) || openPorts.includes(80) || openPorts.includes(443)) {
      return DeviceType.SERVER;
    }

    // Printer detection
    if (openPorts.includes(515) || openPorts.includes(631) || openPorts.includes(9100)) {
      return DeviceType.PRINTER;
    }

    return DeviceType.UNKNOWN;
  }

  /**
   * Detect operating system
   */
  private async detectOperatingSystem(device: NetworkDevice): Promise<string | undefined> {
    // OS fingerprinting based on open ports and services
    const openPorts = device.ports.filter(p => p.state === 'open').map(p => p.number);

    if (openPorts.includes(3389) || openPorts.includes(135) || openPorts.includes(445)) {
      return 'Windows';
    }

    if (openPorts.includes(22) && !openPorts.includes(3389)) {
      return 'Linux/Unix';
    }

    return undefined;
  }

  // Helper methods for vulnerability checks
  private async checkDefaultCredentials(service: Service): Promise<any[]> {
    // Implementation for default credentials check
    return [];
  }

  private async checkKnownExploits(service: Service): Promise<any[]> {
    // Implementation for known exploits check
    return [];
  }

  private async checkConfigurationIssues(service: Service): Promise<any[]> {
    // Implementation for configuration issues check
    return [];
  }

  private async checkOutdatedVersions(service: Service): Promise<any[]> {
    // Implementation for outdated versions check
    return [];
  }

  private async getServiceConfiguration(ip: string, port: Port): Promise<Record<string, any>> {
    // Implementation for service configuration detection
    return {};
  }

  /**
   * Expand target range (CIDR, ranges, etc.)
   */
  private async expandTargetRange(target: string): Promise<string[]> {
    const hosts: string[] = [];

    if (target.includes('/')) {
      // CIDR notation
      hosts.push(...this.expandCIDR(target));
    } else if (target.includes('-')) {
      // IP range
      hosts.push(...this.expandIPRange(target));
    } else {
      // Single host
      hosts.push(target);
    }

    return hosts;
  }

  private expandCIDR(cidr: string): string[] {
    const hosts: string[] = [];
    // CIDR expansion implementation
    // This is a simplified version - full implementation would handle all CIDR ranges
    return hosts;
  }

  private expandIPRange(range: string): string[] {
    const hosts: string[] = [];
    // IP range expansion implementation
    return hosts;
  }

  private initializeStatistics(): ScanStatistics {
    return {
      total_hosts: 0,
      hosts_up: 0,
      total_ports_scanned: 0,
      open_ports: 0,
      services_detected: 0,
      vulnerabilities_found: 0,
      scan_rate: 0
    };
  }
}