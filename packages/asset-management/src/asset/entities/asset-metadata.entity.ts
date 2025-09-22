import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { Asset } from './asset.entity';

/**
 * Asset Metadata entity for storing key-value metadata
 * Supports custom fields and extensible asset properties
 */
@Entity('asset_metadata')
@Index(['assetId', 'key'])
@Index(['key', 'value'])
export class AssetMetadata {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  assetId: string;

  @ManyToOne(() => Asset, asset => asset.metadata, {
    onDelete: 'CASCADE',
  })
  asset: Asset;

  @Column({ length: 100 })
  @Index()
  key: string; // e.g., 'camera_model', 'resolution', 'author', 'license'

  @Column({ type: 'text' })
  value: string;

  @Column({
    type: 'enum',
    enum: ['string', 'number', 'boolean', 'date', 'json'],
    default: 'string',
  })
  valueType: 'string' | 'number' | 'boolean' | 'date' | 'json';

  @Column({ default: false })
  isSearchable: boolean; // Whether this metadata should be included in search

  @Column({ default: false })
  isPublic: boolean; // Whether this metadata is visible to non-owners

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  /**
   * Get typed value based on valueType
   */
  getTypedValue(): string | number | boolean | Date | object {
    switch (this.valueType) {
      case 'number':
        return parseFloat(this.value);
      case 'boolean':
        return this.value.toLowerCase() === 'true';
      case 'date':
        return new Date(this.value);
      case 'json':
        try {
          return JSON.parse(this.value);
        } catch {
          return this.value;
        }
      default:
        return this.value;
    }
  }

  /**
   * Set value with automatic type detection
   */
  setTypedValue(value: any): void {
    if (typeof value === 'number') {
      this.valueType = 'number';
      this.value = value.toString();
    } else if (typeof value === 'boolean') {
      this.valueType = 'boolean';
      this.value = value.toString();
    } else if (value instanceof Date) {
      this.valueType = 'date';
      this.value = value.toISOString();
    } else if (typeof value === 'object') {
      this.valueType = 'json';
      this.value = JSON.stringify(value);
    } else {
      this.valueType = 'string';
      this.value = value.toString();
    }
  }
}