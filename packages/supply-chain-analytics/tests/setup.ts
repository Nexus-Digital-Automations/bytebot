/**
 * Test setup configuration for Supply Chain Analytics
 * Enterprise-grade testing framework with comprehensive coverage
 */

import 'reflect-metadata';
import { DataSource, Repository, ObjectLiteral } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  SupplyChainNodeEntity,
  ProductEntity,
  InventoryItemEntity,
  DemandForecastEntity,
  SupplyChainEventEntity,
  OptimizationRecommendationEntity,
  PerformanceKPIEntity,
  ScenarioAnalysisEntity
} from '../src/models/supply-chain.entity';

/**
 * Test database configuration
 */
const testDataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  entities: [
    SupplyChainNodeEntity,
    ProductEntity,
    InventoryItemEntity,
    DemandForecastEntity,
    SupplyChainEventEntity,
    OptimizationRecommendationEntity,
    PerformanceKPIEntity,
    ScenarioAnalysisEntity
  ],
  synchronize: true,
  logging: false,
});

/**
 * Mock repository factory
 */
export function createMockRepository<T extends ObjectLiteral = any>(): Partial<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getCount: jest.fn(),
      getManyAndCount: jest.fn(),
    })),
  };
}

/**
 * Test module factory for services
 */
export async function createTestingModule(
  serviceClass: any,
  additionalProviders: any[] = []
): Promise<TestingModule> {
  const module: TestingModule = await Test.createTestingModule({
    providers: [
      serviceClass,
      {
        provide: getRepositoryToken(SupplyChainNodeEntity),
        useValue: createMockRepository<SupplyChainNodeEntity>(),
      },
      {
        provide: getRepositoryToken(ProductEntity),
        useValue: createMockRepository<ProductEntity>(),
      },
      {
        provide: getRepositoryToken(InventoryItemEntity),
        useValue: createMockRepository<InventoryItemEntity>(),
      },
      {
        provide: getRepositoryToken(DemandForecastEntity),
        useValue: createMockRepository<DemandForecastEntity>(),
      },
      {
        provide: getRepositoryToken(SupplyChainEventEntity),
        useValue: createMockRepository<SupplyChainEventEntity>(),
      },
      {
        provide: getRepositoryToken(OptimizationRecommendationEntity),
        useValue: createMockRepository<OptimizationRecommendationEntity>(),
      },
      {
        provide: getRepositoryToken(PerformanceKPIEntity),
        useValue: createMockRepository<PerformanceKPIEntity>(),
      },
      {
        provide: getRepositoryToken(ScenarioAnalysisEntity),
        useValue: createMockRepository<ScenarioAnalysisEntity>(),
      },
      ...additionalProviders,
    ],
  }).compile();

  return module;
}

/**
 * Test data factories
 */
export class TestDataFactory {
  static createSupplyChainNode(overrides: Partial<SupplyChainNodeEntity> = {}): SupplyChainNodeEntity {
    const node = new SupplyChainNodeEntity();
    node.id = overrides.id || 'test-node-1';
    node.name = overrides.name || 'Test Supplier';
    node.type = overrides.type || 'supplier';
    node.tier = overrides.tier || 1;
    node.location = overrides.location || {
      latitude: 40.7128,
      longitude: -74.0060,
      address: '123 Test St',
      city: 'New York',
      state: 'NY',
      country: 'USA',
      postalCode: '10001',
      timezone: 'America/New_York'
    };
    node.capacity = overrides.capacity || {
      maxDailyOutput: 1000,
      currentUtilization: 80,
      peakCapacityPeriods: ['Q4'],
      seasonalVariations: [],
      capacityConstraints: [],
      expansionPlans: []
    };
    node.performance = overrides.performance || {
      supplierId: node.id,
      onTimeDeliveryRate: 95,
      qualityScore: 90,
      costCompetitiveness: 85,
      responsiveness: 88,
      sustainabilityRating: 75,
      riskScore: 25,
      relationshipDuration: 24,
      totalTransactionValue: 500000,
      lastAuditDate: new Date(),
      certifications: ['ISO9001']
    };
    node.risks = overrides.risks || [];
    node.sustainability = overrides.sustainability || {
      carbonFootprint: {
        scope1Emissions: 100,
        scope2Emissions: 50,
        scope3Emissions: 200,
        totalEmissions: 350,
        emissionsPerUnit: 0.35,
        carbonNeutralTarget: null,
        offsetPrograms: []
      },
      waterUsage: {
        totalConsumption: 1000,
        recyclingRate: 30,
        sourceTypes: ['municipal'],
        qualityMetrics: [],
        conservationInitiatives: []
      },
      wasteManagement: {
        totalWasteGenerated: 500,
        recyclingRate: 60,
        wasteTypes: [],
        disposalMethods: [],
        wasteReductionTargets: []
      },
      energyConsumption: {
        totalConsumption: 10000,
        renewablePercentage: 25,
        energySources: [],
        efficiencyMetrics: [],
        conservationMeasures: []
      },
      socialResponsibility: {
        employeeWellbeing: {
          totalEmployees: 100,
          turnoverRate: 10,
          satisfactionScore: 85,
          safetyIncidentRate: 2,
          trainingHoursPerEmployee: 40,
          benefitsScore: 80
        },
        communityImpact: {
          localEmploymentPercentage: 70,
          communityInvestment: 50000,
          localSupplierPercentage: 60,
          volunteerHours: 500,
          communityProjects: []
        },
        diversityInclusion: {
          genderDiversity: 45,
          ethnicDiversity: 35,
          ageDistribution: [],
          leadershipDiversity: 40,
          payEquityScore: 90,
          inclusionScore: 85
        },
        laborPractices: {
          fairWageCompliance: true,
          workingHoursCompliance: true,
          childLaborPolicy: true,
          forcedLaborPolicy: true,
          unionizationRate: 25,
          grievanceProcedures: true,
          auditResults: []
        },
        humanRights: {
          humanRightsPolicy: true,
          riskAssessment: true,
          grievanceMechanism: true,
          training: true,
          monitoring: true,
          reporting: true,
          violations: []
        }
      },
      certifications: [],
      esgScore: 75
    };
    node.contactInfo = overrides.contactInfo || {
      primaryContact: {
        name: 'John Doe',
        title: 'Manager',
        email: 'john@test.com',
        phone: '+1-555-0123',
        mobile: '+1-555-0124',
        languages: ['English'],
        preferredCommunication: 'email'
      },
      emergencyContact: {
        name: 'Jane Doe',
        title: 'Emergency Manager',
        email: 'jane@test.com',
        phone: '+1-555-0125',
        mobile: '+1-555-0126',
        languages: ['English'],
        preferredCommunication: 'phone'
      },
      technicalContact: {
        name: 'Tech Support',
        title: 'Technical Manager',
        email: 'tech@test.com',
        phone: '+1-555-0127',
        mobile: '+1-555-0128',
        languages: ['English'],
        preferredCommunication: 'email'
      },
      financialContact: {
        name: 'Finance Dept',
        title: 'Financial Manager',
        email: 'finance@test.com',
        phone: '+1-555-0129',
        mobile: '+1-555-0130',
        languages: ['English'],
        preferredCommunication: 'email'
      }
    };
    node.financialHealth = overrides.financialHealth || {
      creditRating: 'A',
      debtToEquityRatio: 0.3,
      currentRatio: 2.5,
      quickRatio: 1.8,
      profitMargin: 15,
      revenue: 10000000,
      ebitda: 2000000,
      cashFlow: 1500000,
      paymentTermsCompliance: 98,
      bankruptcyRisk: 5,
      lastFinancialAudit: new Date()
    };
    node.complianceStatus = overrides.complianceStatus || {
      overallStatus: 'compliant',
      lastAuditDate: new Date(),
      nextAuditDate: new Date(),
      complianceAreas: [],
      violations: [],
      certifications: []
    };
    node.isActive = overrides.isActive !== undefined ? overrides.isActive : true;
    node.createdAt = overrides.createdAt || new Date();
    node.updatedAt = overrides.updatedAt || new Date();

    return node;
  }

  static createProduct(overrides: Partial<ProductEntity> = {}): ProductEntity {
    const product = new ProductEntity();
    product.id = overrides.id || 'test-product-1';
    product.sku = overrides.sku || 'TEST-001';
    product.name = overrides.name || 'Test Product';
    product.description = overrides.description || 'A test product for unit testing';
    product.category = overrides.category || 'Electronics';
    product.subcategory = overrides.subcategory || 'Components';
    product.unitOfMeasure = overrides.unitOfMeasure || 'each';
    product.dimensions = overrides.dimensions || {
      length: 10,
      width: 5,
      height: 2,
      volume: 100
    };
    product.weight = overrides.weight || 0.5;
    product.value = overrides.value || 25.00;
    product.shelfLife = overrides.shelfLife || 365;
    product.storageRequirements = overrides.storageRequirements || [];
    product.handlingInstructions = overrides.handlingInstructions || ['Handle with care'];
    product.hazardousClassification = overrides.hazardousClassification || undefined;
    product.regulatoryRequirements = overrides.regulatoryRequirements || [];
    product.billOfMaterials = overrides.billOfMaterials || [];
    product.qualityStandards = overrides.qualityStandards || [];
    product.packaging = overrides.packaging || {
      primaryPackaging: {
        material: 'Plastic',
        dimensions: { length: 11, width: 6, height: 3, volume: 198 },
        weight: 0.05,
        cost: 0.50,
        recyclable: true,
        biodegradable: false,
        reusable: false
      },
      secondaryPackaging: {
        material: 'Cardboard',
        dimensions: { length: 12, width: 7, height: 4, volume: 336 },
        weight: 0.1,
        cost: 0.25,
        recyclable: true,
        biodegradable: true,
        reusable: false
      },
      tertiaryPackaging: {
        material: 'Corrugated Box',
        dimensions: { length: 50, width: 30, height: 20, volume: 30000 },
        weight: 0.5,
        cost: 2.00,
        recyclable: true,
        biodegradable: true,
        reusable: true
      },
      sustainability: {
        recyclablePercentage: 90,
        renewableContentPercentage: 60,
        carbonFootprint: 0.8,
        endOfLifeOptions: ['recycle', 'compost']
      }
    };
    product.primarySupplierId = overrides.primarySupplierId || 'test-node-1';
    product.isActive = overrides.isActive !== undefined ? overrides.isActive : true;
    product.createdAt = overrides.createdAt || new Date();
    product.updatedAt = overrides.updatedAt || new Date();

    return product;
  }

  static createInventoryItem(overrides: Partial<InventoryItemEntity> = {}): InventoryItemEntity {
    const item = new InventoryItemEntity();
    item.id = overrides.id || 'test-inventory-1';
    item.productId = overrides.productId || 'test-product-1';
    item.locationId = overrides.locationId || 'test-node-1';
    item.quantityOnHand = overrides.quantityOnHand || 100;
    item.quantityAvailable = overrides.quantityAvailable || 80;
    item.quantityReserved = overrides.quantityReserved || 20;
    item.quantityOnOrder = overrides.quantityOnOrder || 50;
    item.reorderPoint = overrides.reorderPoint || 25;
    item.safetyStock = overrides.safetyStock || 15;
    item.maximumStock = overrides.maximumStock || 200;
    item.averageCost = overrides.averageCost || 25.00;
    item.lastMovementDate = overrides.lastMovementDate || new Date();
    item.turnoverRate = overrides.turnoverRate || 12;
    item.daysOnHand = overrides.daysOnHand || 30;
    item.abcClassification = overrides.abcClassification || 'A';
    item.obsolescenceRisk = overrides.obsolescenceRisk || 10;
    item.demandPattern = overrides.demandPattern || {
      type: 'steady',
      seasonality: null,
      trend: null,
      volatility: 15,
      forecastAccuracy: 85
    };
    item.lotTracking = overrides.lotTracking || [];
    item.supplierId = overrides.supplierId || 'test-node-1';
    item.createdAt = overrides.createdAt || new Date();
    item.updatedAt = overrides.updatedAt || new Date();

    return item;
  }

  static createDemandForecast(overrides: Partial<DemandForecastEntity> = {}): DemandForecastEntity {
    const forecast = new DemandForecastEntity();
    forecast.id = overrides.id || 'test-forecast-1';
    forecast.productId = overrides.productId || 'test-product-1';
    forecast.locationId = overrides.locationId || 'test-node-1';
    forecast.forecastDate = overrides.forecastDate || new Date();
    forecast.forecast = overrides.forecast || 85;
    forecast.lowerBound = overrides.lowerBound || 70;
    forecast.upperBound = overrides.upperBound || 100;
    forecast.confidence = overrides.confidence || 85;
    forecast.method = overrides.method || 'neural-network';
    forecast.methodType = overrides.methodType || 'machine-learning';
    forecast.methodParameters = overrides.methodParameters || {};
    forecast.accuracy = overrides.accuracy || {
      mae: 5.2,
      mape: 6.1,
      rmse: 7.3,
      bias: 0.5,
      trackingSignal: 0.8,
      lastUpdated: new Date(),
      historicalPerformance: []
    };
    forecast.assumptions = overrides.assumptions || ['Stable market conditions'];
    forecast.factors = overrides.factors || [];
    forecast.generatedBy = overrides.generatedBy || 'test-system';
    forecast.generatedDate = overrides.generatedDate || new Date();
    forecast.updatedAt = overrides.updatedAt || new Date();

    return forecast;
  }

  static createSupplyChainEvent(overrides: Partial<SupplyChainEventEntity> = {}): SupplyChainEventEntity {
    const event = new SupplyChainEventEntity();
    event.id = overrides.id || 'test-event-1';
    event.type = overrides.type || 'shipment-arrived';
    event.timestamp = overrides.timestamp || new Date();
    event.source = overrides.source || {
      system: 'test-system',
      component: 'test-component',
      version: '1.0.0',
      location: 'test-location',
      userId: null
    };
    event.severity = overrides.severity || 'info';
    event.title = overrides.title || 'Test Event';
    event.description = overrides.description || 'A test event for unit testing';
    event.affected = overrides.affected || [];
    event.impact = overrides.impact || {
      operational: {
        severity: 'low',
        affectedProcesses: [],
        downtime: null,
        capacityImpact: 0,
        alternativesAvailable: true
      },
      financial: {
        estimatedCost: 0,
        revenueImpact: 0,
        costCategory: 'operational',
        insured: false,
        recoverable: false
      },
      customer: {
        affectedCustomers: 0,
        deliveryDelay: null,
        qualityImpact: false,
        communicationRequired: false,
        compensationRequired: false
      },
      reputation: {
        severity: 'low',
        mediaExposure: false,
        brandDamage: false,
        stakeholderConcern: false,
        recoveryTime: null
      },
      regulatory: {
        violations: [],
        reportingRequired: false,
        finesRisk: false,
        licenseRisk: false,
        auditTriggered: false
      }
    };
    event.resolution = overrides.resolution || null;
    event.metadata = overrides.metadata || {};
    event.correlationId = overrides.correlationId || 'test-correlation-1';
    event.tags = overrides.tags || ['test'];
    event.acknowledged = overrides.acknowledged || false;
    event.acknowledgedAt = overrides.acknowledgedAt || undefined;
    event.acknowledgedBy = overrides.acknowledgedBy || undefined;
    event.sourceNodeId = overrides.sourceNodeId || 'test-node-1';
    event.createdAt = overrides.createdAt || new Date();
    event.updatedAt = overrides.updatedAt || new Date();

    return event;
  }
}

/**
 * Test utilities
 */
export class TestUtils {
  /**
   * Generate test date range
   */
  static getTestDateRange(daysBack: number = 30): { start: Date; end: Date } {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - daysBack);
    return { start, end };
  }

  /**
   * Wait for async operation
   */
  static async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate random number between min and max
   */
  static randomBetween(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random string
   */
  static randomString(length: number = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Deep clone object
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

/**
 * Global test setup
 */
beforeAll(async () => {
  if (!testDataSource.isInitialized) {
    await testDataSource.initialize();
  }
});

afterAll(async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
  }
});

beforeEach(async () => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Clean up after each test if needed
});

export { testDataSource };