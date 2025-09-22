/**
 * Supply Chain Analytics Platform - Entity Models
 * Enterprise-grade TypeORM entities for supply chain data persistence
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToMany,
  ManyToOne,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { IsString, IsNumber, IsDate, IsOptional, IsArray, IsBoolean, ValidateNested, Min, Max, IsUUID } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  GeographicLocation,
  SupplierPerformanceMetrics,
  ProductionCapacity,
  RiskAssessment,
  SustainabilityMetrics,
  ContactInformation,
  FinancialHealthMetrics,
  ComplianceStatus,
  DemandPattern,
  LotTrackingInfo,
  ForecastAccuracy,
  PerformanceKPI,
} from '../interfaces/supply-chain.interface';

/**
 * Supply Chain Node Entity
 * Represents suppliers, manufacturers, distributors, warehouses, etc.
 */
@Entity('supply_chain_nodes')
@Index(['type', 'tier'])
@Index(['location'])
@Index(['performance'])
export class SupplyChainNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name!: string;

  @Column({
    type: 'enum',
    enum: ['supplier', 'manufacturer', 'distributor', 'retailer', 'warehouse', 'logistics'],
  })
  @IsString()
  type!: 'supplier' | 'manufacturer' | 'distributor' | 'retailer' | 'warehouse' | 'logistics';

  @Column({ type: 'int' })
  @IsNumber()
  @Min(1)
  @Max(10)
  tier!: number;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  location!: GeographicLocation;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  capacity!: ProductionCapacity;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  performance!: SupplierPerformanceMetrics;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  @IsArray()
  risks!: RiskAssessment[];

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  sustainability!: SustainabilityMetrics;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  contactInfo!: ContactInformation;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  financialHealth!: FinancialHealthMetrics;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  complianceStatus!: ComplianceStatus;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive!: boolean;

  @CreateDateColumn()
  @IsDate()
  createdAt!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;

  // Relationships
  @OneToMany(() => ProductEntity, (product) => product.primarySupplier)
  suppliedProducts!: ProductEntity[];

  @OneToMany(() => InventoryItemEntity, (inventory) => inventory.supplier)
  inventoryItems!: InventoryItemEntity[];

  @OneToMany(() => SupplyChainEventEntity, (event) => event.sourceNode)
  events!: SupplyChainEventEntity[];

  @OneToMany(() => PerformanceKPIEntity, (kpi) => kpi.node)
  kpis!: PerformanceKPIEntity[];
}

/**
 * Product Entity
 * Represents products in the supply chain
 */
@Entity('products')
@Index(['sku'])
@Index(['category', 'subcategory'])
export class ProductEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @IsString()
  sku!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name!: string;

  @Column({ type: 'text' })
  @IsString()
  @IsOptional()
  description?: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  category!: string;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  subcategory!: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  unitOfMeasure!: string;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  dimensions!: {
    length: number;
    width: number;
    height: number;
    volume: number;
  };

  @Column({ type: 'decimal', precision: 10, scale: 3 })
  @IsNumber()
  @Min(0)
  weight!: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  @IsNumber()
  @Min(0)
  value!: number;

  @Column({ type: 'int', nullable: true })
  @IsNumber()
  @IsOptional()
  @Min(0)
  shelfLife?: number;

  @Column({ type: 'jsonb' })
  @IsArray()
  storageRequirements!: any[];

  @Column({ type: 'jsonb' })
  @IsArray()
  handlingInstructions!: string[];

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsString()
  @IsOptional()
  hazardousClassification?: string;

  @Column({ type: 'jsonb' })
  @IsArray()
  regulatoryRequirements!: string[];

  @Column({ type: 'jsonb' })
  @IsArray()
  billOfMaterials!: any[];

  @Column({ type: 'jsonb' })
  @IsArray()
  qualityStandards!: any[];

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  packaging!: any;

  @Column({ type: 'boolean', default: true })
  @IsBoolean()
  isActive!: boolean;

  @CreateDateColumn()
  @IsDate()
  createdAt!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => SupplyChainNodeEntity, (node) => node.suppliedProducts)
  @JoinColumn({ name: 'primary_supplier_id' })
  primarySupplier!: SupplyChainNodeEntity;

  @Column({ type: 'uuid' })
  @IsUUID()
  primarySupplierId!: string;

  @OneToMany(() => InventoryItemEntity, (inventory) => inventory.product)
  inventoryItems!: InventoryItemEntity[];

  @OneToMany(() => DemandForecastEntity, (forecast) => forecast.product)
  demandForecasts!: DemandForecastEntity[];
}

/**
 * Inventory Item Entity
 * Represents inventory items at specific locations
 */
@Entity('inventory_items')
@Index(['productId', 'locationId'])
@Index(['quantityOnHand'])
@Index(['reorderPoint'])
export class InventoryItemEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  productId!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  locationId!: string;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  quantityOnHand!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  quantityAvailable!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  quantityReserved!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  quantityOnOrder!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  reorderPoint!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  safetyStock!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  maximumStock!: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  @IsNumber()
  @Min(0)
  averageCost!: number;

  @Column({ type: 'timestamp' })
  @IsDate()
  lastMovementDate!: Date;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  @IsNumber()
  @Min(0)
  turnoverRate!: number;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(0)
  daysOnHand!: number;

  @Column({ type: 'enum', enum: ['A', 'B', 'C'] })
  @IsString()
  abcClassification!: 'A' | 'B' | 'C';

  @Column({ type: 'int' })
  @IsNumber()
  @Min(0)
  @Max(100)
  obsolescenceRisk!: number;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  demandPattern!: DemandPattern;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  @IsArray()
  lotTracking!: LotTrackingInfo[];

  @CreateDateColumn()
  @IsDate()
  createdAt!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => ProductEntity, (product) => product.inventoryItems)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @ManyToOne(() => SupplyChainNodeEntity, (node) => node.inventoryItems)
  @JoinColumn({ name: 'location_id' })
  location!: SupplyChainNodeEntity;

  @ManyToOne(() => SupplyChainNodeEntity)
  @JoinColumn({ name: 'supplier_id' })
  supplier!: SupplyChainNodeEntity;

  @Column({ type: 'uuid' })
  @IsUUID()
  supplierId!: string;
}

/**
 * Demand Forecast Entity
 * Represents demand forecasts for products
 */
@Entity('demand_forecasts')
@Index(['productId', 'locationId'])
@Index(['forecastDate'])
@Index(['method'])
export class DemandForecastEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  productId!: string;

  @Column({ type: 'uuid' })
  @IsUUID()
  locationId!: string;

  @Column({ type: 'date' })
  @IsDate()
  forecastDate!: Date;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  forecast!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  lowerBound!: number;

  @Column({ type: 'decimal', precision: 15, scale: 3 })
  @IsNumber()
  @Min(0)
  upperBound!: number;

  @Column({ type: 'int' })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence!: number;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  method!: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  methodType!: 'statistical' | 'machine-learning' | 'expert-judgment' | 'hybrid';

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  methodParameters!: Record<string, any>;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  accuracy!: ForecastAccuracy;

  @Column({ type: 'jsonb' })
  @IsArray()
  assumptions!: string[];

  @Column({ type: 'jsonb' })
  @IsArray()
  factors!: any[];

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  generatedBy!: string;

  @CreateDateColumn()
  @IsDate()
  generatedDate!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => ProductEntity, (product) => product.demandForecasts)
  @JoinColumn({ name: 'product_id' })
  product!: ProductEntity;

  @ManyToOne(() => SupplyChainNodeEntity)
  @JoinColumn({ name: 'location_id' })
  location!: SupplyChainNodeEntity;
}

/**
 * Supply Chain Event Entity
 * Represents real-time events in the supply chain
 */
@Entity('supply_chain_events')
@Index(['type', 'severity'])
@Index(['timestamp'])
@Index(['sourceNodeId'])
@Index(['correlationId'])
export class SupplyChainEventEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({
    type: 'enum',
    enum: [
      'shipment-delayed',
      'shipment-arrived',
      'shipment-departed',
      'quality-issue',
      'supplier-disruption',
      'demand-spike',
      'demand-drop',
      'inventory-low',
      'inventory-excess',
      'cost-change',
      'weather-disruption',
      'geopolitical-risk',
      'cyber-incident',
      'compliance-violation',
      'system-error',
      'maintenance-scheduled',
      'capacity-change',
      'contract-renewal',
      'audit-finding',
    ],
  })
  @IsString()
  type!: string;

  @Column({ type: 'timestamp' })
  @IsDate()
  timestamp!: Date;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  source!: {
    system: string;
    component: string;
    version: string;
    location: string;
    userId: string | null;
  };

  @Column({ type: 'enum', enum: ['info', 'warning', 'error', 'critical'] })
  @IsString()
  severity!: 'info' | 'warning' | 'error' | 'critical';

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  title!: string;

  @Column({ type: 'text' })
  @IsString()
  description!: string;

  @Column({ type: 'jsonb' })
  @IsArray()
  affected!: any[];

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  impact!: any;

  @Column({ type: 'jsonb', nullable: true })
  @ValidateNested()
  @Type(() => Object)
  @IsOptional()
  resolution?: any;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  metadata!: Record<string, any>;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  correlationId!: string;

  @Column({ type: 'jsonb' })
  @IsArray()
  tags!: string[];

  @Column({ type: 'boolean', default: false })
  @IsBoolean()
  acknowledged!: boolean;

  @Column({ type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  acknowledgedAt?: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsString()
  @IsOptional()
  acknowledgedBy?: string;

  @CreateDateColumn()
  @IsDate()
  createdAt!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => SupplyChainNodeEntity, (node) => node.events)
  @JoinColumn({ name: 'source_node_id' })
  sourceNode!: SupplyChainNodeEntity;

  @Column({ type: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  sourceNodeId?: string;
}

/**
 * Optimization Recommendation Entity
 * Represents AI-generated optimization recommendations
 */
@Entity('optimization_recommendations')
@Index(['type', 'priority'])
@Index(['status'])
@Index(['validUntil'])
export class OptimizationRecommendationEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({
    type: 'enum',
    enum: [
      'inventory-reduction',
      'inventory-increase',
      'supplier-diversification',
      'supplier-consolidation',
      'route-optimization',
      'warehouse-relocation',
      'capacity-expansion',
      'capacity-reduction',
      'cost-reduction',
      'lead-time-improvement',
      'quality-improvement',
      'sustainability-improvement',
      'risk-mitigation',
      'technology-upgrade',
      'process-automation',
    ],
  })
  @IsString()
  type!: string;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'critical'] })
  @IsString()
  priority!: 'low' | 'medium' | 'high' | 'critical';

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  title!: string;

  @Column({ type: 'text' })
  @IsString()
  description!: string;

  @Column({ type: 'text' })
  @IsString()
  rationale!: string;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  impact!: {
    costSavings: number;
    revenueIncrease: number;
    efficiencyGain: number;
    qualityImprovement: number;
    riskReduction: number;
    sustainabilityImprovement: number;
    timeframe: number;
    roi: number;
  };

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  implementation!: any;

  @Column({ type: 'jsonb' })
  @IsArray()
  risks!: any[];

  @Column({ type: 'jsonb' })
  @IsArray()
  dependencies!: string[];

  @Column({ type: 'jsonb' })
  @IsArray()
  alternatives!: any[];

  @Column({ type: 'int' })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence!: number;

  @Column({ type: 'timestamp' })
  @IsDate()
  validUntil!: Date;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  generatedBy!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'in-progress', 'completed', 'rejected'],
    default: 'pending',
  })
  @IsString()
  status!: 'pending' | 'approved' | 'in-progress' | 'completed' | 'rejected';

  @Column({ type: 'varchar', length: 100, nullable: true })
  @IsString()
  @IsOptional()
  approvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  @IsDate()
  @IsOptional()
  approvedAt?: Date;

  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  approvalNotes?: string;

  @CreateDateColumn()
  @IsDate()
  generatedDate!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;
}

/**
 * Performance KPI Entity
 * Represents key performance indicators
 */
@Entity('performance_kpis')
@Index(['category', 'name'])
@Index(['owner'])
@Index(['lastUpdated'])
export class PerformanceKPIEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name!: string;

  @Column({
    type: 'enum',
    enum: [
      'cost',
      'quality',
      'delivery',
      'flexibility',
      'innovation',
      'sustainability',
      'risk',
      'customer-satisfaction',
      'supplier-performance',
      'inventory',
      'capacity-utilization',
    ],
  })
  @IsString()
  category!: string;

  @Column({ type: 'text' })
  @IsString()
  description!: string;

  @Column({ type: 'varchar', length: 50 })
  @IsString()
  unit!: string;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  @IsNumber()
  value!: number;

  @Column({ type: 'decimal', precision: 15, scale: 4 })
  @IsNumber()
  target!: number;

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  threshold!: {
    excellent: number;
    good: number;
    acceptable: number;
    poor: number;
    critical: number;
  };

  @Column({ type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  trend!: {
    direction: 'improving' | 'stable' | 'declining';
    slope: number;
    confidence: number;
    changePoints: Date[];
    seasonality: boolean;
  };

  @Column({ type: 'enum', enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'] })
  @IsString()
  frequency!: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  owner!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  dataSource!: string;

  @Column({ type: 'text' })
  @IsString()
  calculationMethod!: string;

  @Column({ type: 'jsonb' })
  @IsArray()
  historicalData!: any[];

  @Column({ type: 'timestamp' })
  @IsDate()
  lastUpdated!: Date;

  @CreateDateColumn()
  @IsDate()
  createdAt!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;

  // Relationships
  @ManyToOne(() => SupplyChainNodeEntity, (node) => node.kpis)
  @JoinColumn({ name: 'node_id' })
  node!: SupplyChainNodeEntity;

  @Column({ type: 'uuid', nullable: true })
  @IsUUID()
  @IsOptional()
  nodeId?: string;
}

/**
 * Scenario Analysis Entity
 * Represents scenario analysis and what-if simulations
 */
@Entity('scenario_analyses')
@Index(['type', 'status'])
@Index(['createdBy'])
@Index(['lastRunDate'])
export class ScenarioAnalysisEntity {
  @PrimaryGeneratedColumn('uuid')
  @IsUUID()
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @IsString()
  name!: string;

  @Column({ type: 'text' })
  @IsString()
  description!: string;

  @Column({ type: 'enum', enum: ['what-if', 'stress-test', 'monte-carlo', 'sensitivity'] })
  @IsString()
  type!: 'what-if' | 'stress-test' | 'monte-carlo' | 'sensitivity';

  @Column({ type: 'jsonb' })
  @IsArray()
  parameters!: any[];

  @Column({ type: 'jsonb' })
  @IsArray()
  results!: any[];

  @Column({ type: 'jsonb' })
  @IsArray()
  recommendations!: string[];

  @Column({ type: 'int' })
  @IsNumber()
  @Min(0)
  @Max(100)
  confidence!: number;

  @Column({ type: 'varchar', length: 100 })
  @IsString()
  createdBy!: string;

  @Column({ type: 'timestamp' })
  @IsDate()
  lastRunDate!: Date;

  @Column({ type: 'enum', enum: ['draft', 'running', 'completed', 'failed'] })
  @IsString()
  status!: 'draft' | 'running' | 'completed' | 'failed';

  @Column({ type: 'text', nullable: true })
  @IsString()
  @IsOptional()
  errorMessage?: string;

  @Column({ type: 'int', nullable: true })
  @IsNumber()
  @IsOptional()
  executionTime?: number; // milliseconds

  @CreateDateColumn()
  @IsDate()
  createdDate!: Date;

  @UpdateDateColumn()
  @IsDate()
  updatedAt!: Date;
}