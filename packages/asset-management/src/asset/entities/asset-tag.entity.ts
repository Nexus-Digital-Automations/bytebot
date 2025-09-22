import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  Index,
} from 'typeorm';
import { Asset } from './asset.entity';

/**
 * Asset Tag entity for categorization and organization
 * Supports hierarchical tagging and color coding
 */
@Entity('asset_tags')
@Index(['name'])
@Index(['category'])
export class AssetTag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  category: string; // e.g., 'project', 'department', 'type', 'status'

  @Column({ length: 7, default: '#6B7280' })
  color: string; // Hex color code for UI display

  @Column({ default: 0 })
  usageCount: number; // Track how many assets use this tag

  @Column({ default: true })
  isActive: boolean;

  @ManyToMany(() => Asset, asset => asset.tags)
  assets: Asset[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Increment usage count when tag is applied to an asset
   */
  incrementUsage(): void {
    this.usageCount++;
  }

  /**
   * Decrement usage count when tag is removed from an asset
   */
  decrementUsage(): void {
    if (this.usageCount > 0) {
      this.usageCount--;
    }
  }
}