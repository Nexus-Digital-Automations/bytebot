/**
 * Device Entity
 * Core device model for enterprise mobile device management
 *
 * Agent 3: Device Management - Device Entity Model
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  BeforeInsert,
  BeforeUpdate
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsBoolean, IsOptional, IsUUID, IsDateString } from 'class-validator';
import { DeviceEnrollment } from './device-enrollment.entity';
import { DeviceProfile } from './device-profile.entity';
import { DeviceGroup } from './device-group.entity';
import { DeviceActivity } from './device-activity.entity';

/**
 * Device platform enumeration
 */
export enum DevicePlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux'
}

/**
 * Device status enumeration
 */
export enum DeviceStatus {
  PENDING_ENROLLMENT = 'pending_enrollment',
  ENROLLED = 'enrolled',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  RETIRED = 'retired',
  LOST = 'lost',
  STOLEN = 'stolen',
  WIPED = 'wiped'
}

/**
 * Device compliance status enumeration
 */
export enum DeviceComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  UNKNOWN = 'unknown',
  GRACE_PERIOD = 'grace_period',
  BLOCKED = 'blocked'
}

/**
 * Device ownership type enumeration
 */
export enum DeviceOwnership {
  CORPORATE = 'corporate',
  PERSONAL = 'personal',
  SHARED = 'shared'
}

/**
 * Device Entity
 * Represents a managed mobile device in the enterprise environment
 */
@Entity('devices')
@Index(['platform', 'status'])
@Index(['userId', 'status'])
@Index(['serialNumber'], { unique: true })
@Index(['udid'], { unique: true })
export class Device {
  @ApiProperty({
    description: 'Unique device identifier',
    example: '550e8400-e29b-41d4-a716-446655440000'
  })
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty({
    description: 'Device name assigned by user or administrator',
    example: 'John Doe iPhone'
  })
  @Column({ length: 255 })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Device platform/operating system',
    enum: DevicePlatform,
    example: DevicePlatform.IOS
  })
  @Column({
    type: 'varchar',
    enum: DevicePlatform
  })
  @IsEnum(DevicePlatform)
  platform: DevicePlatform;

  @ApiProperty({
    description: 'Operating system version',
    example: '17.1.1'
  })
  @Column({ length: 50 })
  @IsString()
  osVersion: string;

  @ApiProperty({
    description: 'Device model/hardware identifier',
    example: 'iPhone 15 Pro'
  })
  @Column({ length: 255 })
  @IsString()
  model: string;

  @ApiProperty({
    description: 'Device manufacturer',
    example: 'Apple'
  })
  @Column({ length: 100 })
  @IsString()
  manufacturer: string;

  @ApiProperty({
    description: 'Device serial number',
    example: 'F2LLD8J4P7QX'
  })
  @Column({ length: 255, unique: true })
  @IsString()
  serialNumber: string;

  @ApiProperty({
    description: 'Unique Device Identifier (UDID)',
    example: 'b4f1a8c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8'
  })
  @Column({ length: 255, unique: true })
  @IsString()
  udid: string;

  @ApiProperty({
    description: 'International Mobile Equipment Identity (IMEI)',
    example: '123456789012345'
  })
  @Column({ length: 50, nullable: true })
  @IsString()
  @IsOptional()
  imei?: string;

  @ApiProperty({
    description: 'Wi-Fi MAC address',
    example: '00:11:22:33:44:55'
  })
  @Column({ length: 17, nullable: true })
  @IsString()
  @IsOptional()
  wifiMacAddress?: string;

  @ApiProperty({
    description: 'Bluetooth MAC address',
    example: '00:11:22:33:44:66'
  })
  @Column({ length: 17, nullable: true })
  @IsString()
  @IsOptional()
  bluetoothMacAddress?: string;

  @ApiProperty({
    description: 'Current device status',
    enum: DeviceStatus,
    example: DeviceStatus.ACTIVE
  })
  @Column({
    type: 'varchar',
    enum: DeviceStatus,
    default: DeviceStatus.PENDING_ENROLLMENT
  })
  @IsEnum(DeviceStatus)
  status: DeviceStatus;

  @ApiProperty({
    description: 'Device compliance status',
    enum: DeviceComplianceStatus,
    example: DeviceComplianceStatus.COMPLIANT
  })
  @Column({
    type: 'varchar',
    enum: DeviceComplianceStatus,
    default: DeviceComplianceStatus.UNKNOWN
  })
  @IsEnum(DeviceComplianceStatus)
  complianceStatus: DeviceComplianceStatus;

  @ApiProperty({
    description: 'Device ownership type',
    enum: DeviceOwnership,
    example: DeviceOwnership.CORPORATE
  })
  @Column({
    type: 'varchar',
    enum: DeviceOwnership,
    default: DeviceOwnership.CORPORATE
  })
  @IsEnum(DeviceOwnership)
  ownership: DeviceOwnership;

  @ApiProperty({
    description: 'User ID associated with the device',
    example: '550e8400-e29b-41d4-a716-446655440001'
  })
  @Column({ type: 'varchar', nullable: true })
  @IsUUID()
  @IsOptional()
  userId?: string;

  @ApiProperty({
    description: 'User email associated with the device',
    example: 'john.doe@company.com'
  })
  @Column({ length: 255, nullable: true })
  @IsString()
  @IsOptional()
  userEmail?: string;

  @ApiProperty({
    description: 'Device enrollment date',
    example: '2024-01-15T10:30:00Z'
  })
  @Column({ type: 'datetime', nullable: true })
  @IsDateString()
  @IsOptional()
  enrolledAt?: Date;

  @ApiProperty({
    description: 'Last device check-in timestamp',
    example: '2024-01-20T15:45:30Z'
  })
  @Column({ type: 'datetime', nullable: true })
  @IsDateString()
  @IsOptional()
  lastCheckIn?: Date;

  @ApiProperty({
    description: 'Last known location latitude',
    example: 37.7749
  })
  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  @IsOptional()
  lastLatitude?: number;

  @ApiProperty({
    description: 'Last known location longitude',
    example: -122.4194
  })
  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  @IsOptional()
  lastLongitude?: number;

  @ApiProperty({
    description: 'Battery level percentage',
    example: 85
  })
  @Column({ type: 'integer', nullable: true })
  @IsOptional()
  batteryLevel?: number;

  @ApiProperty({
    description: 'Available storage space in MB',
    example: 15360
  })
  @Column({ type: 'bigint', nullable: true })
  @IsOptional()
  availableStorage?: number;

  @ApiProperty({
    description: 'Total storage capacity in MB',
    example: 65536
  })
  @Column({ type: 'bigint', nullable: true })
  @IsOptional()
  totalStorage?: number;

  @ApiProperty({
    description: 'Whether device is supervised',
    example: true
  })
  @Column({ default: false })
  @IsBoolean()
  isSupervised: boolean;

  @ApiProperty({
    description: 'Whether device is jailbroken/rooted',
    example: false
  })
  @Column({ default: false })
  @IsBoolean()
  isJailbroken: boolean;

  @ApiProperty({
    description: 'Whether device encryption is enabled',
    example: true
  })
  @Column({ default: false })
  @IsBoolean()
  isEncrypted: boolean;

  @ApiProperty({
    description: 'Whether device has passcode enabled',
    example: true
  })
  @Column({ default: false })
  @IsBoolean()
  hasPasscode: boolean;

  @ApiProperty({
    description: 'Device tags for categorization',
    example: ['executive', 'finance', 'remote-worker']
  })
  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({
    description: 'Additional device metadata',
    example: { department: 'Engineering', cost_center: 'CC-001' }
  })
  @Column({ type: 'simple-json', nullable: true })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Device creation timestamp'
  })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({
    description: 'Device last update timestamp'
  })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relationships
  @OneToMany(() => DeviceEnrollment, enrollment => enrollment.device)
  enrollments: DeviceEnrollment[];

  @ManyToOne(() => DeviceProfile, profile => profile.devices, { nullable: true })
  @JoinColumn({ name: 'profileId' })
  profile?: DeviceProfile;

  @Column({ type: 'varchar', nullable: true })
  profileId?: string;

  @ManyToOne(() => DeviceGroup, group => group.devices, { nullable: true })
  @JoinColumn({ name: 'groupId' })
  group?: DeviceGroup;

  @Column({ type: 'varchar', nullable: true })
  groupId?: string;

  @OneToMany(() => DeviceActivity, activity => activity.device)
  activities: DeviceActivity[];

  /**
   * Calculate device age in days
   */
  get ageInDays(): number {
    if (!this.enrolledAt) return 0;
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.enrolledAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if device is online (checked in within last 24 hours)
   */
  get isOnline(): boolean {
    if (!this.lastCheckIn) return false;
    const now = new Date();
    const diffHours = (now.getTime() - this.lastCheckIn.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  /**
   * Get storage usage percentage
   */
  get storageUsagePercentage(): number {
    if (!this.totalStorage || !this.availableStorage) return 0;
    const usedStorage = this.totalStorage - this.availableStorage;
    return Math.round((usedStorage / this.totalStorage) * 100);
  }

  /**
   * Pre-insert validation and setup
   */
  @BeforeInsert()
  validateBeforeInsert(): void {
    if (!this.name?.trim()) {
      this.name = `${this.manufacturer} ${this.model}`;
    }

    if (!this.udid && this.serialNumber) {
      // Generate UDID-like identifier if not provided
      this.udid = `${this.platform}-${this.serialNumber}-${Date.now()}`;
    }
  }

  /**
   * Pre-update validation
   */
  @BeforeUpdate()
  validateBeforeUpdate(): void {
    if (this.lastCheckIn) {
      // Auto-update status based on check-in frequency
      const now = new Date();
      const diffDays = (now.getTime() - this.lastCheckIn.getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays > 30 && this.status === DeviceStatus.ACTIVE) {
        this.status = DeviceStatus.INACTIVE;
      }
    }
  }
}