import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  ManyToMany,
  JoinTable,
  Index,
} from 'typeorm';
import { AssetVersion } from '../../version/entities/asset-version.entity';
import { AssetTag } from './asset-tag.entity';
import { AssetMetadata } from './asset-metadata.entity';
import { User } from '../../security/entities/user.entity';

/**
 * Core Asset entity for Digital Asset Management System
 * Represents any digital asset with comprehensive metadata and version control
 */
@Entity('assets')
@Index(['name', 'type'])
@Index(['status', 'createdAt'])
@Index(['ownerId', 'status'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 100 })
  @Index()
  type: string; // image, video, audio, document, archive, etc.

  @Column({ length: 100 })
  mimeType: string;

  @Column({ type: 'bigint' })
  size: number; // File size in bytes

  @Column({ length: 500 })
  filePath: string; // Local file system path

  @Column({ length: 64, nullable: true })
  @Index()
  checksum: string; // SHA-256 hash for integrity verification

  @Column({
    type: 'enum',
    enum: ['draft', 'published', 'archived', 'deleted'],
    default: 'draft',
  })
  @Index()
  status: 'draft' | 'published' | 'archived' | 'deleted';

  @Column({
    type: 'enum',
    enum: ['public', 'private', 'restricted'],
    default: 'private',
  })
  visibility: 'public' | 'private' | 'restricted';

  // Ownership and permissions
  @Column('uuid')
  @Index()
  ownerId: string;

  @ManyToOne(() => User, { eager: false })
  owner: User;

  @Column('uuid', { nullable: true })
  lastModifiedBy: string;

  @ManyToOne(() => User, { eager: false })
  lastModifier: User;

  // Version control
  @Column({ default: 1 })
  currentVersion: number;

  @OneToMany(() => AssetVersion, version => version.asset, {
    cascade: true,
    eager: false,
  })
  versions: AssetVersion[];

  // Metadata and tagging
  @OneToMany(() => AssetMetadata, metadata => metadata.asset, {
    cascade: true,
    eager: false,
  })
  metadata: AssetMetadata[];

  @ManyToMany(() => AssetTag, tag => tag.assets, {
    cascade: false,
    eager: false,
  })
  @JoinTable({
    name: 'asset_tags',
    joinColumn: { name: 'assetId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' },
  })
  tags: AssetTag[];

  // Analytics fields
  @Column({ default: 0 })
  downloadCount: number;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lastAccessedAt: Date;

  // Collaboration fields
  @Column({ default: false })
  isLocked: boolean;

  @Column('uuid', { nullable: true })
  lockedBy: string;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date;

  // Thumbnail and preview paths
  @Column({ length: 500, nullable: true })
  thumbnailPath: string;

  @Column({ length: 500, nullable: true })
  previewPath: string;

  // Search optimization
  @Column({ type: 'text', nullable: true })
  @Index({ fulltext: true })
  searchableText: string; // Extracted text content for search

  @Column({ type: 'simple-json', nullable: true })
  searchEmbedding: number[]; // AI-generated embedding for semantic search

  // Performance tracking
  @Column({ type: 'simple-json', nullable: true })
  processingMetrics: {
    uploadTime?: number;
    processingTime?: number;
    thumbnailGenerationTime?: number;
    indexingTime?: number;
  };

  // Audit fields
  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  deletedAt: Date; // Soft deletion

  // Business logic methods

  /**
   * Check if asset is currently locked for editing
   */
  isCurrentlyLocked(): boolean {
    return this.isLocked && this.lockedAt &&
           (Date.now() - this.lockedAt.getTime()) < 3600000; // 1 hour timeout
  }

  /**
   * Get display name for asset
   */
  getDisplayName(): string {
    return this.name || `Asset-${this.id.slice(0, 8)}`;
  }

  /**
   * Check if user can edit this asset
   */
  canEdit(userId: string): boolean {
    return this.ownerId === userId || !this.isCurrentlyLocked();
  }

  /**
   * Get file extension from mime type or file path
   */
  getFileExtension(): string {
    if (this.filePath) {
      const parts = this.filePath.split('.');
      return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
    }

    // Fallback to mime type mapping
    const mimeToExt: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'application/pdf': 'pdf',
    };

    return mimeToExt[this.mimeType] || '';
  }

  /**
   * Update analytics counters
   */
  incrementViewCount(): void {
    this.viewCount++;
    this.lastAccessedAt = new Date();
  }

  incrementDownloadCount(): void {
    this.downloadCount++;
    this.lastAccessedAt = new Date();
  }
}