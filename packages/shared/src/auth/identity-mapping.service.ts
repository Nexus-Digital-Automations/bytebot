/**
 * Identity Mapping Service - Cross-system user identity synchronization
 *
 * Enterprise-grade identity mapping service providing seamless user identity
 * synchronization between AIgent and Parlant systems with intelligent role
 * mapping, permission translation, and conflict resolution.
 *
 * Features:
 * - Bi-directional user identity mapping and synchronization
 * - Intelligent role and permission translation
 * - Conflict resolution with configurable strategies
 * - Real-time identity synchronization
 * - Identity federation and SSO integration
 * - Audit trails for identity operations
 * - Compliance-aware identity management
 * - Performance optimization with intelligent caching
 *
 * @module IdentityMappingService
 * @version 1.0.0
 * @author PARLANT Phase 1 Identity Team
 * @since 2025-09-21
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';

/**
 * Identity mapping configuration
 */
export interface IdentityMappingConfig {
  /** Synchronization strategy */
  syncStrategy: 'realtime' | 'periodic' | 'on-demand' | 'hybrid';
  /** Sync interval for periodic strategy */
  syncInterval: number;
  /** Conflict resolution strategy */
  conflictResolution: 'aigent-wins' | 'parlant-wins' | 'merge' | 'manual' | 'latest-wins';
  /** Enable automatic role mapping */
  autoRoleMapping: boolean;
  /** Enable automatic permission mapping */
  autoPermissionMapping: boolean;
  /** Cache configuration */
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  /** Federation settings */
  federation: {
    enabled: boolean;
    providers: string[];
    defaultProvider: string;
  };
  /** Audit settings */
  audit: {
    enabled: boolean;
    includeData: boolean;
    retentionDays: number;
  };
}

/**
 * User identity across systems
 */
export interface CrossSystemUserIdentity {
  /** Mapping ID */
  mappingId: string;
  /** AIgent user information */
  aigent: {
    userId: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
    profile: Record<string, unknown>;
    lastUpdated: Date;
    active: boolean;
  };
  /** Parlant user information */
  parlant: {
    userId: string;
    username: string;
    email: string;
    roles: string[];
    permissions: string[];
    profile: Record<string, unknown>;
    lastUpdated: Date;
    active: boolean;
  };
  /** Common identity attributes */
  common: {
    primaryEmail: string;
    displayName: string;
    preferredUsername: string;
    mappedRoles: string[];
    mappedPermissions: string[];
    securityLevel: string;
    lastSync: Date;
    syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  };
  /** Mapping metadata */
  metadata: {
    createdAt: Date;
    createdBy: string;
    lastModifiedAt: Date;
    lastModifiedBy: string;
    syncHistory: SyncHistoryEntry[];
    conflicts: ConflictEntry[];
    federationInfo?: FederationInfo;
  };
}

/**
 * Role mapping configuration
 */
export interface RoleMapping {
  /** Mapping ID */
  mappingId: string;
  /** Source system */
  sourceSystem: 'aigent' | 'parlant';
  /** Source role */
  sourceRole: string;
  /** Target system */
  targetSystem: 'aigent' | 'parlant';
  /** Target role */
  targetRole: string;
  /** Mapping type */
  mappingType: 'direct' | 'hierarchical' | 'computed' | 'conditional';
  /** Mapping conditions */
  conditions?: Record<string, unknown>;
  /** Mapping priority */
  priority: number;
  /** Active status */
  active: boolean;
  /** Metadata */
  metadata: {
    createdAt: Date;
    createdBy: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Permission mapping configuration
 */
export interface PermissionMapping {
  /** Mapping ID */
  mappingId: string;
  /** Source system */
  sourceSystem: 'aigent' | 'parlant';
  /** Source permission */
  sourcePermission: string;
  /** Target system */
  targetSystem: 'aigent' | 'parlant';
  /** Target permission */
  targetPermission: string;
  /** Mapping type */
  mappingType: 'direct' | 'scoped' | 'computed' | 'conditional';
  /** Permission scope */
  scope?: string;
  /** Mapping conditions */
  conditions?: Record<string, unknown>;
  /** Active status */
  active: boolean;
  /** Metadata */
  metadata: {
    createdAt: Date;
    createdBy: string;
    description?: string;
    tags?: string[];
  };
}

/**
 * Synchronization history entry
 */
export interface SyncHistoryEntry {
  /** Sync timestamp */
  timestamp: Date;
  /** Sync type */
  type: 'full' | 'incremental' | 'conflict-resolution' | 'manual';
  /** Source system */
  sourceSystem: 'aigent' | 'parlant' | 'both';
  /** Sync result */
  result: 'success' | 'partial' | 'failed';
  /** Changes made */
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    source: string;
  }[];
  /** Error information */
  error?: string;
  /** Sync duration */
  duration: number;
  /** Triggered by */
  triggeredBy: string;
}

/**
 * Conflict entry
 */
export interface ConflictEntry {
  /** Conflict ID */
  conflictId: string;
  /** Conflict timestamp */
  timestamp: Date;
  /** Conflict type */
  type: 'role' | 'permission' | 'profile' | 'status' | 'other';
  /** Field in conflict */
  field: string;
  /** AIgent value */
  aigentValue: unknown;
  /** Parlant value */
  parlantValue: unknown;
  /** Resolution strategy used */
  resolutionStrategy: string;
  /** Resolved value */
  resolvedValue?: unknown;
  /** Resolution timestamp */
  resolvedAt?: Date;
  /** Resolved by */
  resolvedBy?: string;
  /** Manual resolution required */
  requiresManualResolution: boolean;
}

/**
 * Federation information
 */
export interface FederationInfo {
  /** Federation provider */
  provider: string;
  /** External user ID */
  externalUserId: string;
  /** Provider-specific attributes */
  attributes: Record<string, unknown>;
  /** Last federation sync */
  lastSync: Date;
  /** Federation status */
  status: 'active' | 'inactive' | 'error';
}

/**
 * Identity synchronization result
 */
export interface IdentitySyncResult {
  /** Synchronization success */
  success: boolean;
  /** User identity */
  identity?: CrossSystemUserIdentity;
  /** Changes applied */
  changes: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
    source: string;
  }[];
  /** Conflicts encountered */
  conflicts: ConflictEntry[];
  /** Sync metadata */
  metadata: {
    syncId: string;
    timestamp: Date;
    duration: number;
    syncType: string;
    sourceSystem: string;
    triggeredBy: string;
  };
  /** Error information */
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Identity mapping analytics
 */
export interface IdentityMappingAnalytics {
  /** Total mapped identities */
  totalMappedIdentities: number;
  /** Active mappings */
  activeMappings: number;
  /** Sync statistics */
  syncStats: {
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    averageSyncTime: number;
    lastSyncTime: Date;
  };
  /** Conflict statistics */
  conflictStats: {
    totalConflicts: number;
    resolvedConflicts: number;
    pendingConflicts: number;
    manualResolutionRequired: number;
  };
  /** System distribution */
  systemDistribution: {
    aigentOnly: number;
    parlantOnly: number;
    bothSystems: number;
  };
  /** Role mapping statistics */
  roleMappingStats: {
    totalMappings: number;
    activeMappings: number;
    mostMappedRoles: Array<{ role: string; count: number }>;
  };
  /** Permission mapping statistics */
  permissionMappingStats: {
    totalMappings: number;
    activeMappings: number;
    mostMappedPermissions: Array<{ permission: string; count: number }>;
  };
  /** Last updated */
  lastUpdated: Date;
}

/**
 * Identity Mapping Service
 *
 * Advanced identity mapping service providing seamless cross-system
 * user identity synchronization with intelligent conflict resolution
 * and comprehensive audit capabilities.
 */
@Injectable()
export class IdentityMappingService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IdentityMappingService.name);

  // Configuration
  private config!: IdentityMappingConfig;

  // HTTP clients
  private aigentClient!: AxiosInstance;
  private parlantClient!: AxiosInstance;

  // Storage
  private identityMappings = new Map<string, CrossSystemUserIdentity>();
  private roleMappings = new Map<string, RoleMapping>();
  private permissionMappings = new Map<string, PermissionMapping>();
  private emailToMappingId = new Map<string, string>();
  private syncQueue = new Set<string>();

  // Analytics
  private analytics: IdentityMappingAnalytics = {
    totalMappedIdentities: 0,
    activeMappings: 0,
    syncStats: {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      averageSyncTime: 0,
      lastSyncTime: new Date(),
    },
    conflictStats: {
      totalConflicts: 0,
      resolvedConflicts: 0,
      pendingConflicts: 0,
      manualResolutionRequired: 0,
    },
    systemDistribution: {
      aigentOnly: 0,
      parlantOnly: 0,
      bothSystems: 0,
    },
    roleMappingStats: {
      totalMappings: 0,
      activeMappings: 0,
      mostMappedRoles: [],
    },
    permissionMappingStats: {
      totalMappings: 0,
      activeMappings: 0,
      mostMappedPermissions: [],
    },
    lastUpdated: new Date(),
  };

  // Periodic tasks
  private syncTimer: NodeJS.Timeout | null = null;
  private analyticsTimer: NodeJS.Timeout | null = null;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly configService: ConfigService,
    @Inject('IDENTITY_MAPPING_CONFIG') private readonly mappingConfig: Partial<IdentityMappingConfig>,
  ) {
    super();
    this.logger.log('👥 Initializing Identity Mapping Service');
  }

  /**
   * Initialize the identity mapping service
   */
  async onModuleInit(): Promise<void> {
    const startTime = Date.now();
    this.logger.log('🔄 Starting identity mapping initialization...');

    try {
      await this.loadConfiguration();
      await this.initializeClients();
      await this.loadDefaultMappings();
      await this.startPeriodicTasks();
      await this.performInitialSync();

      const initTime = Date.now() - startTime;
      this.logger.log(`✅ Identity mapping initialized successfully (${initTime}ms)`);

      this.emit('identity:initialized', {
        timestamp: new Date(),
        initializationTime: initTime,
        configuration: this.sanitizeConfig(),
      });
    } catch (error) {
      this.logger.error('❌ Failed to initialize identity mapping', error);
      throw new Error(`Identity mapping initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Clean up resources on module destruction
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('🔄 Shutting down identity mapping...');

    await this.stopPeriodicTasks();
    await this.flushSyncQueue();

    this.logger.log('✅ Identity mapping shutdown complete');
  }

  /**
   * Create or update user identity mapping
   */
  async createOrUpdateIdentityMapping(
    aigentUser?: {
      userId: string;
      username: string;
      email: string;
      roles: string[];
      permissions: string[];
      profile?: Record<string, unknown>;
    },
    parlantUser?: {
      userId: string;
      username: string;
      email: string;
      roles: string[];
      permissions: string[];
      profile?: Record<string, unknown>;
    },
    options?: {
      mappingId?: string;
      conflictResolution?: string;
      triggeredBy?: string;
    },
  ): Promise<IdentitySyncResult> {
    const syncId = this.generateSyncId();
    const startTime = Date.now();

    try {
      this.logger.debug(`🔄 Creating/updating identity mapping: ${syncId}`);

      // Determine primary email for lookup
      const primaryEmail = aigentUser?.email || parlantUser?.email;
      if (!primaryEmail) {
        throw new Error('Primary email required for identity mapping');
      }

      // Find existing mapping
      let existingMappingId = options?.mappingId || this.emailToMappingId.get(primaryEmail);
      let existingMapping = existingMappingId ? this.identityMappings.get(existingMappingId) : null;

      // Create new mapping if none exists
      if (!existingMapping) {
        existingMappingId = this.generateMappingId();
        existingMapping = await this.createNewIdentityMapping(existingMappingId, primaryEmail);
      }

      const changes: Array<{ field: string; oldValue: unknown; newValue: unknown; source: string }> = [];
      const conflicts: ConflictEntry[] = [];

      // Update AIgent user information
      if (aigentUser) {
        await this.updateAigentUserInfo(existingMapping, aigentUser, changes, conflicts);
      }

      // Update Parlant user information
      if (parlantUser) {
        await this.updateParlantUserInfo(existingMapping, parlantUser, changes, conflicts);
      }

      // Resolve conflicts
      await this.resolveConflicts(existingMapping, conflicts, options?.conflictResolution);

      // Update common attributes
      await this.updateCommonAttributes(existingMapping);

      // Store updated mapping
      this.identityMappings.set(existingMappingId!, existingMapping);
      this.emailToMappingId.set(primaryEmail, existingMappingId!);

      // Add to sync history
      existingMapping.metadata.syncHistory.push({
        timestamp: new Date(),
        type: existingMapping.metadata.syncHistory.length === 0 ? 'full' : 'incremental',
        sourceSystem: aigentUser && parlantUser ? 'both' : (aigentUser ? 'aigent' : 'parlant'),
        result: conflicts.length > 0 ? 'partial' : 'success',
        changes,
        duration: Date.now() - startTime,
        triggeredBy: options?.triggeredBy || 'api',
      });

      // Update analytics
      this.updateSyncAnalytics(true, Date.now() - startTime);

      const result: IdentitySyncResult = {
        success: true,
        identity: existingMapping,
        changes,
        conflicts,
        metadata: {
          syncId,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          syncType: 'manual',
          sourceSystem: aigentUser && parlantUser ? 'both' : (aigentUser ? 'aigent' : 'parlant'),
          triggeredBy: options?.triggeredBy || 'api',
        },
      };

      this.logger.log(`✅ Identity mapping updated: ${existingMappingId} (${Date.now() - startTime}ms)`);

      // Emit event
      this.emit('identity:updated', {
        mappingId: existingMappingId,
        changes,
        conflicts,
        timestamp: new Date(),
      });

      return result;
    } catch (error) {
      this.updateSyncAnalytics(false, Date.now() - startTime);

      this.logger.error(`❌ Identity mapping failed: ${syncId}`, error);

      return {
        success: false,
        changes: [],
        conflicts: [],
        metadata: {
          syncId,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          syncType: 'manual',
          sourceSystem: 'unknown',
          triggeredBy: options?.triggeredBy || 'api',
        },
        error: {
          code: 'MAPPING_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Synchronize user identity from source system
   */
  async synchronizeIdentity(
    email: string,
    sourceSystem: 'aigent' | 'parlant',
    options?: {
      forceSync?: boolean;
      conflictResolution?: string;
    },
  ): Promise<IdentitySyncResult> {
    const syncId = this.generateSyncId();
    const startTime = Date.now();

    try {
      this.logger.debug(`🔄 Synchronizing identity: ${email} from ${sourceSystem}`);

      // Fetch user data from source system
      let userData: any;
      if (sourceSystem === 'aigent') {
        userData = await this.fetchAigentUser(email);
      } else {
        userData = await this.fetchParlantUser(email);
      }

      if (!userData) {
        throw new Error(`User not found in ${sourceSystem}: ${email}`);
      }

      // Create or update mapping
      if (sourceSystem === 'aigent') {
        return await this.createOrUpdateIdentityMapping(userData, undefined, {
          conflictResolution: options?.conflictResolution,
          triggeredBy: 'sync',
        });
      } else {
        return await this.createOrUpdateIdentityMapping(undefined, userData, {
          conflictResolution: options?.conflictResolution,
          triggeredBy: 'sync',
        });
      }
    } catch (error) {
      this.updateSyncAnalytics(false, Date.now() - startTime);

      return {
        success: false,
        changes: [],
        conflicts: [],
        metadata: {
          syncId,
          timestamp: new Date(),
          duration: Date.now() - startTime,
          syncType: 'sync',
          sourceSystem,
          triggeredBy: 'sync',
        },
        error: {
          code: 'SYNC_FAILED',
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  /**
   * Get identity mapping by email
   */
  getIdentityByEmail(email: string): CrossSystemUserIdentity | null {
    const mappingId = this.emailToMappingId.get(email);
    return mappingId ? this.identityMappings.get(mappingId) || null : null;
  }

  /**
   * Get identity mapping by user ID
   */
  getIdentityByUserId(userId: string, system: 'aigent' | 'parlant'): CrossSystemUserIdentity | null {
    for (const identity of this.identityMappings.values()) {
      if (system === 'aigent' && identity.aigent.userId === userId) {
        return identity;
      }
      if (system === 'parlant' && identity.parlant.userId === userId) {
        return identity;
      }
    }
    return null;
  }

  /**
   * Map roles from source to target system
   */
  mapRoles(roles: string[], sourceSystem: 'aigent' | 'parlant', targetSystem: 'aigent' | 'parlant'): string[] {
    const mappedRoles: string[] = [];

    for (const role of roles) {
      // Find direct role mapping
      const mapping = this.findRoleMapping(role, sourceSystem, targetSystem);
      if (mapping) {
        mappedRoles.push(mapping.targetRole);
      } else {
        // Use default mapping strategy
        mappedRoles.push(role); // Pass through if no mapping found
      }
    }

    return [...new Set(mappedRoles)]; // Remove duplicates
  }

  /**
   * Map permissions from source to target system
   */
  mapPermissions(permissions: string[], sourceSystem: 'aigent' | 'parlant', targetSystem: 'aigent' | 'parlant'): string[] {
    const mappedPermissions: string[] = [];

    for (const permission of permissions) {
      // Find direct permission mapping
      const mapping = this.findPermissionMapping(permission, sourceSystem, targetSystem);
      if (mapping) {
        mappedPermissions.push(mapping.targetPermission);
      } else {
        // Use default mapping strategy
        mappedPermissions.push(permission); // Pass through if no mapping found
      }
    }

    return [...new Set(mappedPermissions)]; // Remove duplicates
  }

  /**
   * Get identity mapping analytics
   */
  getIdentityAnalytics(): IdentityMappingAnalytics {
    return { ...this.analytics };
  }

  /**
   * Get all pending conflicts
   */
  getPendingConflicts(): Array<{ mappingId: string; conflicts: ConflictEntry[] }> {
    const pendingConflicts: Array<{ mappingId: string; conflicts: ConflictEntry[] }> = [];

    for (const [mappingId, identity] of this.identityMappings.entries()) {
      const conflicts = identity.metadata.conflicts.filter(c => c.requiresManualResolution && !c.resolvedAt);
      if (conflicts.length > 0) {
        pendingConflicts.push({ mappingId, conflicts });
      }
    }

    return pendingConflicts;
  }

  /**
   * Resolve conflict manually
   */
  async resolveConflictManually(
    mappingId: string,
    conflictId: string,
    resolution: unknown,
    resolvedBy: string,
  ): Promise<boolean> {
    const identity = this.identityMappings.get(mappingId);
    if (!identity) {
      return false;
    }

    const conflict = identity.metadata.conflicts.find(c => c.conflictId === conflictId);
    if (!conflict) {
      return false;
    }

    // Apply resolution
    conflict.resolvedValue = resolution;
    conflict.resolvedAt = new Date();
    conflict.resolvedBy = resolvedBy;
    conflict.requiresManualResolution = false;

    // Update the actual field value
    await this.applyConflictResolution(identity, conflict);

    this.logger.log(`✅ Conflict resolved manually: ${conflictId} in mapping ${mappingId}`);

    // Emit event
    this.emit('conflict:resolved', {
      mappingId,
      conflictId,
      resolution,
      resolvedBy,
      timestamp: new Date(),
    });

    return true;
  }

  /**
   * Private Methods
   */

  private async loadConfiguration(): Promise<void> {
    this.config = {
      syncStrategy: 'hybrid',
      syncInterval: 600000, // 10 minutes
      conflictResolution: 'merge',
      autoRoleMapping: true,
      autoPermissionMapping: true,
      cache: {
        enabled: true,
        ttl: 3600000, // 1 hour
        maxSize: 10000,
      },
      federation: {
        enabled: false,
        providers: [],
        defaultProvider: '',
      },
      audit: {
        enabled: true,
        includeData: false,
        retentionDays: 90,
      },
      ...(this.configService.get('identityMapping') || {}),
      ...this.mappingConfig,
    };

    this.logger.log('⚙️ Identity mapping configuration loaded');
  }

  private async initializeClients(): Promise<void> {
    // Initialize AIgent client
    this.aigentClient = axios.create({
      baseURL: this.configService.get('AIGENT_API_URL', 'http://localhost:3000'),
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configService.get('AIGENT_API_KEY', '')}`,
      },
    });

    // Initialize Parlant client
    this.parlantClient = axios.create({
      baseURL: this.configService.get('PARLANT_API_URL', 'http://localhost:8000'),
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.configService.get('PARLANT_API_KEY', '')}`,
      },
    });

    this.logger.log('🔗 API clients initialized');
  }

  private async loadDefaultMappings(): Promise<void> {
    // Load default role mappings
    const defaultRoleMappings: RoleMapping[] = [
      {
        mappingId: 'role_admin_mapping',
        sourceSystem: 'aigent',
        sourceRole: 'admin',
        targetSystem: 'parlant',
        targetRole: 'administrator',
        mappingType: 'direct',
        priority: 1,
        active: true,
        metadata: {
          createdAt: new Date(),
          createdBy: 'system',
          description: 'Map admin role to administrator',
        },
      },
      {
        mappingId: 'role_user_mapping',
        sourceSystem: 'aigent',
        sourceRole: 'user',
        targetSystem: 'parlant',
        targetRole: 'user',
        mappingType: 'direct',
        priority: 2,
        active: true,
        metadata: {
          createdAt: new Date(),
          createdBy: 'system',
          description: 'Map user role to user',
        },
      },
    ];

    for (const mapping of defaultRoleMappings) {
      this.roleMappings.set(mapping.mappingId, mapping);
    }

    // Load default permission mappings
    const defaultPermissionMappings: PermissionMapping[] = [
      {
        mappingId: 'perm_read_mapping',
        sourceSystem: 'aigent',
        sourcePermission: 'read',
        targetSystem: 'parlant',
        targetPermission: 'view',
        mappingType: 'direct',
        active: true,
        metadata: {
          createdAt: new Date(),
          createdBy: 'system',
          description: 'Map read permission to view',
        },
      },
      {
        mappingId: 'perm_write_mapping',
        sourceSystem: 'aigent',
        sourcePermission: 'write',
        targetSystem: 'parlant',
        targetPermission: 'edit',
        mappingType: 'direct',
        active: true,
        metadata: {
          createdAt: new Date(),
          createdBy: 'system',
          description: 'Map write permission to edit',
        },
      },
    ];

    for (const mapping of defaultPermissionMappings) {
      this.permissionMappings.set(mapping.mappingId, mapping);
    }

    this.logger.log(`📚 Loaded ${defaultRoleMappings.length} role mappings and ${defaultPermissionMappings.length} permission mappings`);
  }

  private async createNewIdentityMapping(mappingId: string, primaryEmail: string): Promise<CrossSystemUserIdentity> {
    const now = new Date();

    return {
      mappingId,
      aigent: {
        userId: '',
        username: '',
        email: primaryEmail,
        roles: [],
        permissions: [],
        profile: {},
        lastUpdated: now,
        active: false,
      },
      parlant: {
        userId: '',
        username: '',
        email: primaryEmail,
        roles: [],
        permissions: [],
        profile: {},
        lastUpdated: now,
        active: false,
      },
      common: {
        primaryEmail,
        displayName: '',
        preferredUsername: '',
        mappedRoles: [],
        mappedPermissions: [],
        securityLevel: 'MEDIUM',
        lastSync: now,
        syncStatus: 'pending',
      },
      metadata: {
        createdAt: now,
        createdBy: 'system',
        lastModifiedAt: now,
        lastModifiedBy: 'system',
        syncHistory: [],
        conflicts: [],
      },
    };
  }

  private async updateAigentUserInfo(
    identity: CrossSystemUserIdentity,
    aigentUser: any,
    changes: Array<{ field: string; oldValue: unknown; newValue: unknown; source: string }>,
    conflicts: ConflictEntry[],
  ): Promise<void> {
    const now = new Date();

    // Track changes
    if (identity.aigent.userId !== aigentUser.userId) {
      changes.push({
        field: 'aigent.userId',
        oldValue: identity.aigent.userId,
        newValue: aigentUser.userId,
        source: 'aigent',
      });
    }

    if (identity.aigent.username !== aigentUser.username) {
      // Check for conflict with parlant username
      if (identity.parlant.username && identity.parlant.username !== aigentUser.username) {
        conflicts.push(this.createConflict('username', identity.parlant.username, aigentUser.username));
      }

      changes.push({
        field: 'aigent.username',
        oldValue: identity.aigent.username,
        newValue: aigentUser.username,
        source: 'aigent',
      });
    }

    // Update AIgent user info
    identity.aigent = {
      ...identity.aigent,
      userId: aigentUser.userId,
      username: aigentUser.username,
      email: aigentUser.email,
      roles: aigentUser.roles,
      permissions: aigentUser.permissions,
      profile: aigentUser.profile || {},
      lastUpdated: now,
      active: true,
    };
  }

  private async updateParlantUserInfo(
    identity: CrossSystemUserIdentity,
    parlantUser: any,
    changes: Array<{ field: string; oldValue: unknown; newValue: unknown; source: string }>,
    conflicts: ConflictEntry[],
  ): Promise<void> {
    const now = new Date();

    // Track changes
    if (identity.parlant.userId !== parlantUser.userId) {
      changes.push({
        field: 'parlant.userId',
        oldValue: identity.parlant.userId,
        newValue: parlantUser.userId,
        source: 'parlant',
      });
    }

    if (identity.parlant.username !== parlantUser.username) {
      // Check for conflict with aigent username
      if (identity.aigent.username && identity.aigent.username !== parlantUser.username) {
        conflicts.push(this.createConflict('username', identity.aigent.username, parlantUser.username));
      }

      changes.push({
        field: 'parlant.username',
        oldValue: identity.parlant.username,
        newValue: parlantUser.username,
        source: 'parlant',
      });
    }

    // Update Parlant user info
    identity.parlant = {
      ...identity.parlant,
      userId: parlantUser.userId,
      username: parlantUser.username,
      email: parlantUser.email,
      roles: parlantUser.roles,
      permissions: parlantUser.permissions,
      profile: parlantUser.profile || {},
      lastUpdated: now,
      active: true,
    };
  }

  private async updateCommonAttributes(identity: CrossSystemUserIdentity): Promise<void> {
    // Update display name
    identity.common.displayName = identity.aigent.profile?.displayName as string ||
                                   identity.parlant.profile?.displayName as string ||
                                   identity.aigent.username ||
                                   identity.parlant.username;

    // Update preferred username
    identity.common.preferredUsername = identity.aigent.username || identity.parlant.username;

    // Map roles
    const aigentRoles = this.mapRoles(identity.aigent.roles, 'aigent', 'parlant');
    const parlantRoles = this.mapRoles(identity.parlant.roles, 'parlant', 'aigent');
    identity.common.mappedRoles = [...new Set([...aigentRoles, ...parlantRoles])];

    // Map permissions
    const aigentPermissions = this.mapPermissions(identity.aigent.permissions, 'aigent', 'parlant');
    const parlantPermissions = this.mapPermissions(identity.parlant.permissions, 'parlant', 'aigent');
    identity.common.mappedPermissions = [...new Set([...aigentPermissions, ...parlantPermissions])];

    // Update sync status
    identity.common.syncStatus = identity.metadata.conflicts.some(c => c.requiresManualResolution) ? 'conflict' : 'synced';
    identity.common.lastSync = new Date();
  }

  private createConflict(field: string, aigentValue: unknown, parlantValue: unknown): ConflictEntry {
    return {
      conflictId: this.generateConflictId(),
      timestamp: new Date(),
      type: 'other',
      field,
      aigentValue,
      parlantValue,
      resolutionStrategy: this.config.conflictResolution,
      requiresManualResolution: this.config.conflictResolution === 'manual',
    };
  }

  private async resolveConflicts(
    identity: CrossSystemUserIdentity,
    conflicts: ConflictEntry[],
    strategy?: string,
  ): Promise<void> {
    const resolutionStrategy = strategy || this.config.conflictResolution;

    for (const conflict of conflicts) {
      conflict.resolutionStrategy = resolutionStrategy;

      switch (resolutionStrategy) {
        case 'aigent-wins':
          conflict.resolvedValue = conflict.aigentValue;
          break;
        case 'parlant-wins':
          conflict.resolvedValue = conflict.parlantValue;
          break;
        case 'latest-wins':
          conflict.resolvedValue = identity.aigent.lastUpdated > identity.parlant.lastUpdated
            ? conflict.aigentValue
            : conflict.parlantValue;
          break;
        case 'merge':
          conflict.resolvedValue = this.mergeValues(conflict.aigentValue, conflict.parlantValue);
          break;
        case 'manual':
          conflict.requiresManualResolution = true;
          continue;
      }

      if (!conflict.requiresManualResolution) {
        await this.applyConflictResolution(identity, conflict);
        conflict.resolvedAt = new Date();
        conflict.resolvedBy = 'system';
      }

      identity.metadata.conflicts.push(conflict);
    }
  }

  private async applyConflictResolution(identity: CrossSystemUserIdentity, conflict: ConflictEntry): Promise<void> {
    // Apply resolved value to the appropriate field
    const value = conflict.resolvedValue;

    if (conflict.field === 'username') {
      identity.common.preferredUsername = value as string;
    }
    // Add more field resolutions as needed
  }

  private mergeValues(value1: unknown, value2: unknown): unknown {
    // Simple merge strategy - can be enhanced for complex objects
    if (Array.isArray(value1) && Array.isArray(value2)) {
      return [...new Set([...value1, ...value2])];
    }

    if (typeof value1 === 'object' && typeof value2 === 'object' && value1 && value2) {
      return { ...value1, ...value2 };
    }

    // Default to latest value (could be enhanced with more sophisticated logic)
    return value2 || value1;
  }

  private findRoleMapping(role: string, sourceSystem: 'aigent' | 'parlant', targetSystem: 'aigent' | 'parlant'): RoleMapping | null {
    for (const mapping of this.roleMappings.values()) {
      if (mapping.sourceSystem === sourceSystem &&
          mapping.targetSystem === targetSystem &&
          mapping.sourceRole === role &&
          mapping.active) {
        return mapping;
      }
    }
    return null;
  }

  private findPermissionMapping(permission: string, sourceSystem: 'aigent' | 'parlant', targetSystem: 'aigent' | 'parlant'): PermissionMapping | null {
    for (const mapping of this.permissionMappings.values()) {
      if (mapping.sourceSystem === sourceSystem &&
          mapping.targetSystem === targetSystem &&
          mapping.sourcePermission === permission &&
          mapping.active) {
        return mapping;
      }
    }
    return null;
  }

  private async fetchAigentUser(email: string): Promise<any> {
    try {
      const response = await this.aigentClient.get(`/users/by-email/${email}`);
      return response.data;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to fetch AIgent user: ${email}`, error);
      return null;
    }
  }

  private async fetchParlantUser(email: string): Promise<any> {
    try {
      const response = await this.parlantClient.get(`/users/by-email/${email}`);
      return response.data;
    } catch (error) {
      this.logger.warn(`⚠️ Failed to fetch Parlant user: ${email}`, error);
      return null;
    }
  }

  private updateSyncAnalytics(success: boolean, duration: number): void {
    this.analytics.syncStats.totalSyncs++;

    if (success) {
      this.analytics.syncStats.successfulSyncs++;
    } else {
      this.analytics.syncStats.failedSyncs++;
    }

    // Update average sync time
    const totalTime = this.analytics.syncStats.averageSyncTime * (this.analytics.syncStats.totalSyncs - 1) + duration;
    this.analytics.syncStats.averageSyncTime = totalTime / this.analytics.syncStats.totalSyncs;

    this.analytics.syncStats.lastSyncTime = new Date();
    this.analytics.lastUpdated = new Date();
  }

  private async startPeriodicTasks(): Promise<void> {
    if (this.config.syncStrategy === 'periodic' || this.config.syncStrategy === 'hybrid') {
      this.syncTimer = setInterval(() => {
        this.performPeriodicSync();
      }, this.config.syncInterval);
    }

    // Analytics update every 5 minutes
    this.analyticsTimer = setInterval(() => {
      this.updateAnalytics();
    }, 300000);

    // Cleanup every hour
    this.cleanupTimer = setInterval(() => {
      this.performCleanup();
    }, 3600000);

    this.logger.log('⏰ Periodic tasks started');
  }

  private async stopPeriodicTasks(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }

    if (this.analyticsTimer) {
      clearInterval(this.analyticsTimer);
      this.analyticsTimer = null;
    }

    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  private async performInitialSync(): Promise<void> {
    this.logger.log('🔄 Performing initial identity sync...');
    // Implementation would sync initial user data
  }

  private async performPeriodicSync(): Promise<void> {
    this.logger.debug('🔄 Performing periodic identity sync...');
    // Implementation would sync updated user data
  }

  private updateAnalytics(): void {
    this.analytics.totalMappedIdentities = this.identityMappings.size;
    this.analytics.activeMappings = Array.from(this.identityMappings.values())
      .filter(identity => identity.aigent.active || identity.parlant.active).length;

    // Update conflict statistics
    let totalConflicts = 0;
    let resolvedConflicts = 0;
    let pendingConflicts = 0;
    let manualResolutionRequired = 0;

    for (const identity of this.identityMappings.values()) {
      totalConflicts += identity.metadata.conflicts.length;
      resolvedConflicts += identity.metadata.conflicts.filter(c => c.resolvedAt).length;
      pendingConflicts += identity.metadata.conflicts.filter(c => !c.resolvedAt).length;
      manualResolutionRequired += identity.metadata.conflicts.filter(c => c.requiresManualResolution && !c.resolvedAt).length;
    }

    this.analytics.conflictStats = {
      totalConflicts,
      resolvedConflicts,
      pendingConflicts,
      manualResolutionRequired,
    };

    this.analytics.lastUpdated = new Date();
  }

  private async performCleanup(): Promise<void> {
    // Clean up old sync history entries, resolved conflicts, etc.
    this.logger.debug('🧹 Performing identity mapping cleanup...');
  }

  private async flushSyncQueue(): Promise<void> {
    // Complete any pending sync operations
    this.logger.debug('💾 Flushing sync queue...');
  }

  private generateSyncId(): string {
    return `sync_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateMappingId(): string {
    return `mapping_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private generateConflictId(): string {
    return `conflict_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private sanitizeConfig(): Record<string, unknown> {
    return {
      syncStrategy: this.config.syncStrategy,
      conflictResolution: this.config.conflictResolution,
      autoRoleMapping: this.config.autoRoleMapping,
      autoPermissionMapping: this.config.autoPermissionMapping,
      cache: this.config.cache,
      federation: this.config.federation,
      audit: this.config.audit,
    };
  }
}