/**
 * PARLANT Phase 1 Function Registration System - Main Exports
 *
 * Central export point for all registry system components including
 * discovery services, configuration management, health monitoring,
 * and administrative functionality.
 *
 * @fileoverview Registry system main exports
 * @version 1.0.0
 * @author Registry Integration Agent
 */

// Core Discovery Services
export { FunctionDiscoveryService } from './discovery/function-discovery.service';
export { AutoRegistrationService } from './discovery/auto-registration.service';

// Configuration Management
export { ConfigurationManagerService } from './configuration/configuration-manager.service';

// Metadata Management
export { MetadataManagerService } from './metadata/metadata-manager.service';

// Version Management
export { VersionManagerService } from './versioning/version-manager.service';

// Health Monitoring
export { HealthMonitorService } from './health/health-monitor.service';

// Dependency Tracking
export { DependencyTrackerService } from './dependencies/dependency-tracker.service';

// Administrative Services
// export { RegistryAdminService } from './admin/admin.service'; // TODO: Implement admin service

// Core Types
export * from './core/registry.types';

// Default export for convenience
export default {
  FunctionDiscoveryService,
  AutoRegistrationService,
  ConfigurationManagerService,
  MetadataManagerService,
  VersionManagerService,
  HealthMonitorService,
  DependencyTrackerService,
  // RegistryAdminService // TODO: Implement admin service
};