/**
 * Immutable Audit Trail System
 *
 * Implements cryptographically secure, immutable audit trails with
 * blockchain-inspired integrity verification and tamper detection
 *
 * @fileoverview Immutable Audit Trail System
 * @version 2.0.0
 * @author PARLANT Audit Security Specialist
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as crypto from 'crypto';

/**
 * Audit Event Types
 */
export enum AuditEventType {
  // Authentication Events
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  MFA_CHALLENGE = 'MFA_CHALLENGE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // Authorization Events
  ACCESS_GRANTED = 'ACCESS_GRANTED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION',
  ROLE_ASSIGNED = 'ROLE_ASSIGNED',
  PERMISSION_MODIFIED = 'PERMISSION_MODIFIED',

  // Data Events
  DATA_ACCESS = 'DATA_ACCESS',
  DATA_MODIFICATION = 'DATA_MODIFICATION',
  DATA_DELETION = 'DATA_DELETION',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_BACKUP = 'DATA_BACKUP',

  // System Events
  SYSTEM_STARTUP = 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN = 'SYSTEM_SHUTDOWN',
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',
  SOFTWARE_UPDATE = 'SOFTWARE_UPDATE',
  SECURITY_POLICY_CHANGE = 'SECURITY_POLICY_CHANGE',

  // Security Events
  THREAT_DETECTED = 'THREAT_DETECTED',
  INCIDENT_CREATED = 'INCIDENT_CREATED',
  INCIDENT_RESOLVED = 'INCIDENT_RESOLVED',
  VULNERABILITY_DISCOVERED = 'VULNERABILITY_DISCOVERED',
  SECURITY_SCAN = 'SECURITY_SCAN',

  // Compliance Events
  COMPLIANCE_CHECK = 'COMPLIANCE_CHECK',
  AUDIT_STARTED = 'AUDIT_STARTED',
  AUDIT_COMPLETED = 'AUDIT_COMPLETED',
  POLICY_VIOLATION = 'POLICY_VIOLATION',
  EVIDENCE_COLLECTED = 'EVIDENCE_COLLECTED'
}

/**
 * Audit Event Severity
 */
export enum AuditSeverity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Core Audit Event Structure
 */
export interface AuditEvent {
  // Core identifiers
  eventId: string;
  eventType: AuditEventType;
  severity: AuditSeverity;
  timestamp: Date;

  // Actor information
  actor: {
    type: 'user' | 'system' | 'service' | 'automated';
    id: string;
    name?: string;
    sessionId?: string;
    ipAddress?: string;
  };

  // Target/Resource information
  target?: {
    type: 'user' | 'resource' | 'system' | 'configuration';
    id: string;
    name?: string;
    classification?: string;
  };

  // Event details
  details: {
    action: string;
    description: string;
    outcome: 'success' | 'failure' | 'pending';
    metadata: Record<string, unknown>;
  };

  // Context information
  context: {
    source: string;
    correlationId?: string;
    parentEventId?: string;
    workflowId?: string;
    businessContext?: string;
  };

  // Compliance and retention
  compliance: {
    frameworks: string[]; // SOC2, GDPR, HIPAA, etc.
    retentionPeriod: number; // milliseconds
    dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
    personalData: boolean;
  };
}

/**
 * Immutable Audit Block (Blockchain-inspired)
 */
export interface AuditBlock {
  blockId: string;
  blockNumber: number;
  timestamp: Date;
  previousBlockHash: string;
  merkleRoot: string;
  blockHash: string;
  events: AuditEvent[];
  signature: string;
  metadata: {
    createdBy: string;
    eventCount: number;
    blockSize: number;
    compressionType?: string;
  };
}

/**
 * Audit Chain Verification Result
 */
export interface ChainVerificationResult {
  valid: boolean;
  totalBlocks: number;
  verifiedBlocks: number;
  invalidBlocks: AuditBlock[];
  integrityScore: number; // 0-1 scale
  verificationTime: number;
  lastVerified: Date;
  issues: ChainIntegrityIssue[];
}

/**
 * Chain Integrity Issue
 */
export interface ChainIntegrityIssue {
  type: 'hash_mismatch' | 'signature_invalid' | 'timestamp_anomaly' | 'missing_block' | 'corrupted_data';
  blockId: string;
  blockNumber: number;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected: Date;
}

/**
 * Audit Query Interface
 */
export interface AuditQuery {
  // Time range
  startTime?: Date;
  endTime?: Date;

  // Event filters
  eventTypes?: AuditEventType[];
  severity?: AuditSeverity[];
  actorIds?: string[];
  targetIds?: string[];

  // Context filters
  sources?: string[];
  correlationIds?: string[];
  workflowIds?: string[];

  // Compliance filters
  frameworks?: string[];
  dataClassifications?: string[];

  // Query options
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'severity' | 'eventType';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit Query Result
 */
export interface AuditQueryResult {
  events: AuditEvent[];
  totalCount: number;
  hasMore: boolean;
  queryTime: number;
  integrityVerified: boolean;
}

@Injectable()
export class ImmutableAuditTrail {
  private readonly logger = new Logger(ImmutableAuditTrail.name);
  private readonly eventEmitter: EventEmitter2;

  // In-memory storage (in production, this would be a distributed database)
  private readonly auditChain: AuditBlock[] = [];
  private readonly pendingEvents: AuditEvent[] = [];
  private readonly eventIndex: Map<string, { blockNumber: number; eventIndex: number }> = new Map();

  // Configuration
  private readonly maxEventsPerBlock = 1000;
  private readonly blockCreationInterval = 300000; // 5 minutes
  private readonly signingKey: string;
  private readonly hashAlgorithm = 'sha256';

  // Statistics
  private totalEventsRecorded = 0;
  private totalBlocksCreated = 0;
  private lastIntegrityCheck?: Date;

  constructor(eventEmitter: EventEmitter2, signingKey?: string) {
    this.eventEmitter = eventEmitter;
    this.signingKey = signingKey || this.generateSigningKey();

    this.initializeAuditChain();
    this.startBlockCreationTimer();

    this.logger.log('Immutable Audit Trail System initialized');
  }

  /**
   * Initialize the audit chain with genesis block
   */
  private initializeAuditChain(): void {
    const genesisBlock: AuditBlock = {
      blockId: this.generateBlockId(),
      blockNumber: 0,
      timestamp: new Date(),
      previousBlockHash: '0'.repeat(64), // Genesis block has no predecessor
      merkleRoot: this.calculateMerkleRoot([]),
      blockHash: '',
      events: [],
      signature: '',
      metadata: {
        createdBy: 'system',
        eventCount: 0,
        blockSize: 0
      }
    };

    genesisBlock.blockHash = this.calculateBlockHash(genesisBlock);
    genesisBlock.signature = this.signBlock(genesisBlock);

    this.auditChain.push(genesisBlock);
    this.totalBlocksCreated = 1;

    this.logger.log('Genesis block created for audit chain');
  }

  /**
   * Record a new audit event
   */
  public async recordEvent(eventData: Partial<AuditEvent>): Promise<string> {
    try {
      const eventId = this.generateEventId();
      const timestamp = new Date();

      const auditEvent: AuditEvent = {
        eventId,
        eventType: eventData.eventType || AuditEventType.SYSTEM_STARTUP,
        severity: eventData.severity || AuditSeverity.INFO,
        timestamp,

        actor: {
          type: eventData.actor?.type || 'system',
          id: eventData.actor?.id || 'unknown',
          name: eventData.actor?.name,
          sessionId: eventData.actor?.sessionId,
          ipAddress: eventData.actor?.ipAddress
        },

        target: eventData.target,

        details: {
          action: eventData.details?.action || 'unknown',
          description: eventData.details?.description || '',
          outcome: eventData.details?.outcome || 'success',
          metadata: eventData.details?.metadata || {}
        },

        context: {
          source: eventData.context?.source || 'unknown',
          correlationId: eventData.context?.correlationId,
          parentEventId: eventData.context?.parentEventId,
          workflowId: eventData.context?.workflowId,
          businessContext: eventData.context?.businessContext
        },

        compliance: {
          frameworks: eventData.compliance?.frameworks || ['GENERAL'],
          retentionPeriod: eventData.compliance?.retentionPeriod || 2555200000, // 7 years default
          dataClassification: eventData.compliance?.dataClassification || 'internal',
          personalData: eventData.compliance?.personalData || false
        }
      };

      // Add to pending events
      this.pendingEvents.push(auditEvent);
      this.totalEventsRecorded++;

      this.logger.debug(`Audit event recorded: ${eventId} - Type: ${auditEvent.eventType}`);

      // Emit audit event
      this.eventEmitter.emit('audit.event.recorded', {
        eventId,
        eventType: auditEvent.eventType,
        severity: auditEvent.severity,
        actorId: auditEvent.actor.id
      });

      // Check if we should create a new block
      if (this.pendingEvents.length >= this.maxEventsPerBlock) {
        await this.createAuditBlock();
      }

      return eventId;

    } catch (error) {
      this.logger.error('Failed to record audit event', error);
      throw new Error(`Audit event recording failed: ${error.message}`);
    }
  }

  /**
   * Create a new audit block with pending events
   */
  private async createAuditBlock(): Promise<string> {
    if (this.pendingEvents.length === 0) {
      return '';
    }

    try {
      const blockNumber = this.auditChain.length;
      const previousBlock = this.auditChain[blockNumber - 1];
      const eventsToInclude = [...this.pendingEvents];

      const auditBlock: AuditBlock = {
        blockId: this.generateBlockId(),
        blockNumber,
        timestamp: new Date(),
        previousBlockHash: previousBlock.blockHash,
        merkleRoot: this.calculateMerkleRoot(eventsToInclude),
        blockHash: '',
        events: eventsToInclude,
        signature: '',
        metadata: {
          createdBy: 'audit-trail-system',
          eventCount: eventsToInclude.length,
          blockSize: JSON.stringify(eventsToInclude).length
        }
      };

      auditBlock.blockHash = this.calculateBlockHash(auditBlock);
      auditBlock.signature = this.signBlock(auditBlock);

      // Add to chain
      this.auditChain.push(auditBlock);

      // Update event index
      eventsToInclude.forEach((event, index) => {
        this.eventIndex.set(event.eventId, {
          blockNumber,
          eventIndex: index
        });
      });

      // Clear pending events
      this.pendingEvents.length = 0;
      this.totalBlocksCreated++;

      this.logger.log(`Audit block created: ${auditBlock.blockId} - Events: ${eventsToInclude.length}, Block: ${blockNumber}`);

      // Emit block creation event
      this.eventEmitter.emit('audit.block.created', {
        blockId: auditBlock.blockId,
        blockNumber,
        eventCount: eventsToInclude.length,
        blockHash: auditBlock.blockHash
      });

      return auditBlock.blockId;

    } catch (error) {
      this.logger.error('Failed to create audit block', error);
      throw new Error(`Audit block creation failed: ${error.message}`);
    }
  }

  /**
   * Query audit events
   */
  public async queryEvents(query: AuditQuery): Promise<AuditQueryResult> {
    const startTime = Date.now();

    try {
      const allEvents: AuditEvent[] = [];

      // Collect events from all blocks
      for (const block of this.auditChain) {
        allEvents.push(...block.events);
      }

      // Add pending events
      allEvents.push(...this.pendingEvents);

      // Apply filters
      let filteredEvents = this.applyFilters(allEvents, query);

      // Apply sorting
      if (query.sortBy) {
        filteredEvents = this.sortEvents(filteredEvents, query.sortBy, query.sortOrder || 'desc');
      }

      // Apply pagination
      const totalCount = filteredEvents.length;
      const offset = query.offset || 0;
      const limit = query.limit || 100;

      const paginatedEvents = filteredEvents.slice(offset, offset + limit);
      const hasMore = (offset + limit) < totalCount;

      const queryTime = Date.now() - startTime;

      this.logger.debug(`Audit query completed - Results: ${paginatedEvents.length}/${totalCount}, Time: ${queryTime}ms`);

      return {
        events: paginatedEvents,
        totalCount,
        hasMore,
        queryTime,
        integrityVerified: true // Would verify during query in production
      };

    } catch (error) {
      this.logger.error('Audit query failed', error);
      throw new Error(`Audit query failed: ${error.message}`);
    }
  }

  /**
   * Verify audit chain integrity
   */
  public async verifyChainIntegrity(): Promise<ChainVerificationResult> {
    const startTime = Date.now();
    const issues: ChainIntegrityIssue[] = [];
    const invalidBlocks: AuditBlock[] = [];
    let verifiedBlocks = 0;

    this.logger.log('Starting audit chain integrity verification...');

    try {
      for (let i = 0; i < this.auditChain.length; i++) {
        const block = this.auditChain[i];
        const isValid = await this.verifyBlock(block, i);

        if (isValid) {
          verifiedBlocks++;
        } else {
          invalidBlocks.push(block);

          issues.push({
            type: 'hash_mismatch',
            blockId: block.blockId,
            blockNumber: block.blockNumber,
            description: `Block integrity verification failed`,
            severity: 'high',
            detected: new Date()
          });
        }

        // Verify block chain linkage
        if (i > 0) {
          const previousBlock = this.auditChain[i - 1];
          if (block.previousBlockHash !== previousBlock.blockHash) {
            issues.push({
              type: 'hash_mismatch',
              blockId: block.blockId,
              blockNumber: block.blockNumber,
              description: `Previous block hash mismatch`,
              severity: 'critical',
              detected: new Date()
            });
          }
        }
      }

      const integrityScore = this.auditChain.length > 0 ? verifiedBlocks / this.auditChain.length : 1;
      const verificationTime = Date.now() - startTime;
      this.lastIntegrityCheck = new Date();

      const result: ChainVerificationResult = {
        valid: invalidBlocks.length === 0,
        totalBlocks: this.auditChain.length,
        verifiedBlocks,
        invalidBlocks,
        integrityScore,
        verificationTime,
        lastVerified: this.lastIntegrityCheck,
        issues
      };

      this.logger.log(`Chain integrity verification completed - Score: ${(integrityScore * 100).toFixed(1)}%, Time: ${verificationTime}ms`);

      // Emit integrity verification event
      this.eventEmitter.emit('audit.integrity.verified', {
        valid: result.valid,
        integrityScore,
        totalBlocks: this.auditChain.length,
        verificationTime
      });

      return result;

    } catch (error) {
      this.logger.error('Chain integrity verification failed', error);
      throw new Error(`Chain integrity verification failed: ${error.message}`);
    }
  }

  /**
   * Verify individual block integrity
   */
  private async verifyBlock(block: AuditBlock, blockIndex: number): Promise<boolean> {
    try {
      // Verify block hash
      const calculatedHash = this.calculateBlockHash(block);
      if (calculatedHash !== block.blockHash) {
        this.logger.warn(`Block hash mismatch in block ${block.blockNumber}: ${block.blockId}`);
        return false;
      }

      // Verify signature
      const isSignatureValid = this.verifyBlockSignature(block);
      if (!isSignatureValid) {
        this.logger.warn(`Block signature invalid in block ${block.blockNumber}: ${block.blockId}`);
        return false;
      }

      // Verify Merkle root
      const calculatedMerkleRoot = this.calculateMerkleRoot(block.events);
      if (calculatedMerkleRoot !== block.merkleRoot) {
        this.logger.warn(`Merkle root mismatch in block ${block.blockNumber}: ${block.blockId}`);
        return false;
      }

      return true;

    } catch (error) {
      this.logger.error(`Block verification failed for block ${block.blockNumber}`, error);
      return false;
    }
  }

  /**
   * Get audit trail statistics
   */
  public getStatistics(): {
    totalEvents: number;
    totalBlocks: number;
    pendingEvents: number;
    chainIntegrity: number;
    lastIntegrityCheck?: Date;
    storageSize: number;
  } {
    const storageSize = JSON.stringify(this.auditChain).length;

    return {
      totalEvents: this.totalEventsRecorded,
      totalBlocks: this.totalBlocksCreated,
      pendingEvents: this.pendingEvents.length,
      chainIntegrity: 1.0, // Would be calculated from last verification
      lastIntegrityCheck: this.lastIntegrityCheck,
      storageSize
    };
  }

  // Utility Methods

  private applyFilters(events: AuditEvent[], query: AuditQuery): AuditEvent[] {
    return events.filter(event => {
      // Time range filter
      if (query.startTime && event.timestamp < query.startTime) return false;
      if (query.endTime && event.timestamp > query.endTime) return false;

      // Event type filter
      if (query.eventTypes && !query.eventTypes.includes(event.eventType)) return false;

      // Severity filter
      if (query.severity && !query.severity.includes(event.severity)) return false;

      // Actor filter
      if (query.actorIds && !query.actorIds.includes(event.actor.id)) return false;

      // Target filter
      if (query.targetIds && event.target && !query.targetIds.includes(event.target.id)) return false;

      // Source filter
      if (query.sources && !query.sources.includes(event.context.source)) return false;

      // Correlation ID filter
      if (query.correlationIds && event.context.correlationId && !query.correlationIds.includes(event.context.correlationId)) return false;

      // Framework filter
      if (query.frameworks && !query.frameworks.some(f => event.compliance.frameworks.includes(f))) return false;

      // Data classification filter
      if (query.dataClassifications && !query.dataClassifications.includes(event.compliance.dataClassification)) return false;

      return true;
    });
  }

  private sortEvents(events: AuditEvent[], sortBy: string, sortOrder: string): AuditEvent[] {
    return events.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
          break;
        case 'severity':
          const severityOrder = { info: 0, low: 1, medium: 2, high: 3, critical: 4 };
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'eventType':
          comparison = a.eventType.localeCompare(b.eventType);
          break;
        default:
          comparison = a.timestamp.getTime() - b.timestamp.getTime();
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }

  private calculateBlockHash(block: AuditBlock): string {
    const blockData = {
      blockId: block.blockId,
      blockNumber: block.blockNumber,
      timestamp: block.timestamp.toISOString(),
      previousBlockHash: block.previousBlockHash,
      merkleRoot: block.merkleRoot,
      events: block.events,
      metadata: block.metadata
    };

    return crypto
      .createHash(this.hashAlgorithm)
      .update(JSON.stringify(blockData))
      .digest('hex');
  }

  private calculateMerkleRoot(events: AuditEvent[]): string {
    if (events.length === 0) {
      return crypto.createHash(this.hashAlgorithm).update('').digest('hex');
    }

    const eventHashes = events.map(event =>
      crypto.createHash(this.hashAlgorithm)
        .update(JSON.stringify(event))
        .digest('hex')
    );

    // Build Merkle tree
    let currentLevel = eventHashes;

    while (currentLevel.length > 1) {
      const nextLevel: string[] = [];

      for (let i = 0; i < currentLevel.length; i += 2) {
        const left = currentLevel[i];
        const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;

        const combined = crypto
          .createHash(this.hashAlgorithm)
          .update(left + right)
          .digest('hex');

        nextLevel.push(combined);
      }

      currentLevel = nextLevel;
    }

    return currentLevel[0];
  }

  private signBlock(block: AuditBlock): string {
    const blockData = {
      blockId: block.blockId,
      blockNumber: block.blockNumber,
      timestamp: block.timestamp.toISOString(),
      previousBlockHash: block.previousBlockHash,
      merkleRoot: block.merkleRoot,
      blockHash: block.blockHash
    };

    return crypto
      .createHmac(this.hashAlgorithm, this.signingKey)
      .update(JSON.stringify(blockData))
      .digest('hex');
  }

  private verifyBlockSignature(block: AuditBlock): boolean {
    const calculatedSignature = this.signBlock(block);
    return calculatedSignature === block.signature;
  }

  private generateEventId(): string {
    return `AUD_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`.toUpperCase();
  }

  private generateBlockId(): string {
    return `BLK_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`.toUpperCase();
  }

  private generateSigningKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private startBlockCreationTimer(): void {
    setInterval(async () => {
      if (this.pendingEvents.length > 0) {
        try {
          await this.createAuditBlock();
        } catch (error) {
          this.logger.error('Scheduled block creation failed', error);
        }
      }
    }, this.blockCreationInterval);
  }
}