import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InventoryOptimizationService } from '../../src/services/inventory-optimization.service';
import { InventoryItemEntity, ProductEntity, SupplyChainNodeEntity } from '../../src/models/supply-chain.entity';
import { createMockRepository, createTestInventoryItem, createTestProduct, createTestSupplyChainNode } from '../setup';
import { ABCAnalysis, SafetyStockCalculation, JITFeasibilityAnalysis, InventoryOptimizationRecommendation } from '../../src/interfaces/supply-chain.interface';

describe('InventoryOptimizationService', () => {
  let service: InventoryOptimizationService;
  let inventoryRepository: jest.Mocked<Repository<InventoryItemEntity>>;
  let productRepository: jest.Mocked<Repository<ProductEntity>>;
  let supplyChainNodeRepository: jest.Mocked<Repository<SupplyChainNodeEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryOptimizationService,
        {
          provide: getRepositoryToken(InventoryItemEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(SupplyChainNodeEntity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<InventoryOptimizationService>(InventoryOptimizationService);
    inventoryRepository = module.get(getRepositoryToken(InventoryItemEntity));
    productRepository = module.get(getRepositoryToken(ProductEntity));
    supplyChainNodeRepository = module.get(getRepositoryToken(SupplyChainNodeEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('performABCAnalysis', () => {
    it('should perform comprehensive ABC analysis', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        {
          ...createTestInventoryItem(),
          id: 'item-1',
          product: { ...createTestProduct(), id: 'prod-1' },
          quantity: 1000,
          unitCost: 100,
          annualDemand: 12000,
          annualUsageValue: 1200000 // High value - A category
        },
        {
          ...createTestInventoryItem(),
          id: 'item-2',
          product: { ...createTestProduct(), id: 'prod-2' },
          quantity: 500,
          unitCost: 50,
          annualDemand: 8000,
          annualUsageValue: 400000 // Medium value - B category
        },
        {
          ...createTestInventoryItem(),
          id: 'item-3',
          product: { ...createTestProduct(), id: 'prod-3' },
          quantity: 2000,
          unitCost: 5,
          annualDemand: 5000,
          annualUsageValue: 25000 // Low value - C category
        },
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.performABCAnalysis(warehouseId);

      expect(result).toBeDefined();
      expect(result.warehouseId).toBe(warehouseId);
      expect(result.totalItems).toBe(3);
      expect(result.totalValue).toBe(1625000);

      expect(result.categoryA.items).toHaveLength(1);
      expect(result.categoryA.items[0].itemId).toBe('item-1');
      expect(result.categoryA.valuePercentage).toBeCloseTo(73.8, 1); // 1200000/1625000

      expect(result.categoryB.items).toHaveLength(1);
      expect(result.categoryB.items[0].itemId).toBe('item-2');

      expect(result.categoryC.items).toHaveLength(1);
      expect(result.categoryC.items[0].itemId).toBe('item-3');

      expect(result.analysisDate).toBeInstanceOf(Date);
      expect(result.recommendations).toBeDefined();
    });

    it('should calculate cumulative percentages correctly', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        {
          ...createTestInventoryItem(),
          annualUsageValue: 800,
          quantity: 100
        },
        {
          ...createTestInventoryItem(),
          annualUsageValue: 150,
          quantity: 200
        },
        {
          ...createTestInventoryItem(),
          annualUsageValue: 50,
          quantity: 300
        },
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.performABCAnalysis(warehouseId);

      // Total value = 1000
      // Item 1: 800/1000 = 80% (cumulative 80%)
      // Item 2: 150/1000 = 15% (cumulative 95%)
      // Item 3: 50/1000 = 5% (cumulative 100%)

      expect(result.categoryA.valuePercentage).toBeCloseTo(80, 0);
      expect(result.categoryB.valuePercentage).toBeCloseTo(15, 0);
      expect(result.categoryC.valuePercentage).toBeCloseTo(5, 0);
    });

    it('should provide category-specific recommendations', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        { ...createTestInventoryItem(), annualUsageValue: 1000 }, // Category A
        { ...createTestInventoryItem(), annualUsageValue: 100 },  // Category B
        { ...createTestInventoryItem(), annualUsageValue: 10 },   // Category C
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.performABCAnalysis(warehouseId);

      expect(result.recommendations.categoryA).toContain('tight control');
      expect(result.recommendations.categoryB).toContain('moderate control');
      expect(result.recommendations.categoryC).toContain('simple control');
    });

    it('should handle empty warehouse', async () => {
      const warehouseId = 'empty-warehouse';
      inventoryRepository.find.mockResolvedValue([]);

      const result = await service.performABCAnalysis(warehouseId);

      expect(result.totalItems).toBe(0);
      expect(result.totalValue).toBe(0);
      expect(result.categoryA.items).toHaveLength(0);
      expect(result.categoryB.items).toHaveLength(0);
      expect(result.categoryC.items).toHaveLength(0);
    });
  });

  describe('calculateSafetyStock', () => {
    it('should calculate safety stock with statistical method', async () => {
      const productId = 'prod-123';
      const demandVariability = 0.2; // 20% coefficient of variation
      const leadTimeVariability = 0.1; // 10% coefficient of variation
      const serviceLevel = 0.95; // 95% service level

      const mockProduct = {
        ...createTestProduct(),
        id: productId,
        averageDemand: 100, // per day
        averageLeadTime: 7, // days
        demandHistory: [
          { date: new Date('2024-01-01'), demand: 95 },
          { date: new Date('2024-01-02'), demand: 105 },
          { date: new Date('2024-01-03'), demand: 98 },
          { date: new Date('2024-01-04'), demand: 102 },
          { date: new Date('2024-01-05'), demand: 100 },
        ],
        leadTimeHistory: [
          { date: new Date('2024-01-01'), leadTime: 6.8 },
          { date: new Date('2024-01-08'), leadTime: 7.2 },
          { date: new Date('2024-01-15'), leadTime: 6.9 },
          { date: new Date('2024-01-22'), leadTime: 7.1 },
        ]
      };

      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateSafetyStock(productId, {
        method: 'statistical',
        serviceLevel,
        demandVariability,
        leadTimeVariability
      });

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.method).toBe('statistical');
      expect(result.recommendedSafetyStock).toBeGreaterThan(0);
      expect(result.serviceLevel).toBe(serviceLevel);
      expect(result.calculations.zScore).toBeCloseTo(1.645, 2); // 95% service level z-score
      expect(result.calculations.demandStandardDeviation).toBeGreaterThan(0);
      expect(result.calculations.leadTimeStandardDeviation).toBeGreaterThan(0);
      expect(result.calculationDate).toBeInstanceOf(Date);
    });

    it('should calculate safety stock with min-max method', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        averageDemand: 100,
        averageLeadTime: 7,
        maxDemand: 120,
        maxLeadTime: 10
      };

      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateSafetyStock(productId, {
        method: 'min-max'
      });

      expect(result.method).toBe('min-max');
      // Safety stock = (Max demand × Max lead time) - (Average demand × Average lead time)
      // = (120 × 10) - (100 × 7) = 1200 - 700 = 500
      expect(result.recommendedSafetyStock).toBe(500);
      expect(result.calculations.maxDemandLeadTime).toBe(1200);
      expect(result.calculations.averageDemandLeadTime).toBe(700);
    });

    it('should calculate safety stock with time-based method', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        averageDemand: 100,
        averageLeadTime: 7
      };

      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateSafetyStock(productId, {
        method: 'time-based',
        safetyTimeDays: 3
      });

      expect(result.method).toBe('time-based');
      // Safety stock = Average demand × Safety time
      // = 100 × 3 = 300
      expect(result.recommendedSafetyStock).toBe(300);
      expect(result.calculations.safetyTimeDays).toBe(3);
    });

    it('should provide optimization recommendations', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        currentSafetyStock: 200,
        averageDemand: 100,
        carryingCostPerUnit: 5,
        stockoutCostPerUnit: 50
      };

      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateSafetyStock(productId, {
        method: 'statistical',
        serviceLevel: 0.95
      });

      expect(result.costAnalysis).toBeDefined();
      expect(result.costAnalysis.currentCarryingCost).toBeGreaterThan(0);
      expect(result.costAnalysis.recommendedCarryingCost).toBeGreaterThan(0);
      expect(result.costAnalysis.totalCostSaving).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle missing historical data', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        averageDemand: 100,
        averageLeadTime: 7,
        demandHistory: [], // No historical data
        leadTimeHistory: []
      };

      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateSafetyStock(productId, {
        method: 'statistical',
        serviceLevel: 0.95
      });

      expect(result.method).toBe('statistical');
      expect(result.calculations.dataQuality).toBe('insufficient');
      expect(result.recommendations).toContain('Collect more historical data');
    });
  });

  describe('analyzeJITFeasibility', () => {
    it('should analyze JIT feasibility comprehensively', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        id: productId,
        averageDemand: 100,
        demandVariability: 0.1, // Low variability - good for JIT
        setupCost: 500,
        carryingCostPerUnit: 2
      };

      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-1',
          reliability: 0.95,
          averageLeadTime: 3,
          leadTimeVariability: 0.05,
          qualityScore: 0.98,
          flexibility: 0.9,
          location: { distance: 50 } // Close proximity
        },
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-2',
          reliability: 0.90,
          averageLeadTime: 5,
          leadTimeVariability: 0.15,
          qualityScore: 0.92,
          flexibility: 0.7,
          location: { distance: 200 }
        }
      ];

      productRepository.findOne.mockResolvedValue(mockProduct as any);
      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.analyzeJITFeasibility(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.overallFeasibilityScore).toBeGreaterThan(0);
      expect(result.overallFeasibilityScore).toBeLessThanOrEqual(1);
      expect(result.feasibilityLevel).toBeDefined(); // 'high', 'medium', 'low'

      expect(result.criteria.demandStability).toBeGreaterThan(0.8); // Good demand stability
      expect(result.criteria.supplierReliability).toBeGreaterThan(0.9); // Good supplier reliability
      expect(result.criteria.qualityConsistency).toBeGreaterThan(0.9); // Good quality
      expect(result.criteria.supplyFlexibility).toBeGreaterThan(0.7); // Good flexibility

      expect(result.analysis).toBeDefined();
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.riskAssessment).toBeDefined();
      expect(result.analysisDate).toBeInstanceOf(Date);
    });

    it('should identify JIT-friendly scenarios', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        demandVariability: 0.05, // Very stable demand
        forecastAccuracy: 0.95
      };

      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          reliability: 0.98,
          leadTimeVariability: 0.02, // Very consistent lead times
          qualityScore: 0.99,
          flexibility: 0.95,
          location: { distance: 25 } // Very close
        }
      ];

      productRepository.findOne.mockResolvedValue(mockProduct as any);
      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.analyzeJITFeasibility(productId);

      expect(result.feasibilityLevel).toBe('high');
      expect(result.overallFeasibilityScore).toBeGreaterThan(0.8);
      expect(result.recommendations).toContain('Implement JIT strategy');
    });

    it('should identify JIT-unfriendly scenarios', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        demandVariability: 0.4, // High variability
        forecastAccuracy: 0.6
      };

      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          reliability: 0.7, // Low reliability
          leadTimeVariability: 0.3, // High lead time variability
          qualityScore: 0.8,
          flexibility: 0.5,
          location: { distance: 1000 } // Far distance
        }
      ];

      productRepository.findOne.mockResolvedValue(mockProduct as any);
      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.analyzeJITFeasibility(productId);

      expect(result.feasibilityLevel).toBe('low');
      expect(result.overallFeasibilityScore).toBeLessThan(0.5);
      expect(result.recommendations).toContain('traditional inventory management');
    });

    it('should calculate cost-benefit analysis for JIT', async () => {
      const productId = 'prod-123';
      const mockProduct = {
        ...createTestProduct(),
        carryingCostPerUnit: 10,
        averageInventoryValue: 100000,
        setupCost: 1000,
        stockoutCostPerUnit: 100
      };

      productRepository.findOne.mockResolvedValue(mockProduct as any);
      supplyChainNodeRepository.find.mockResolvedValue([createTestSupplyChainNode()] as any);

      const result = await service.analyzeJITFeasibility(productId);

      expect(result.costBenefitAnalysis).toBeDefined();
      expect(result.costBenefitAnalysis.currentInventoryCost).toBeGreaterThan(0);
      expect(result.costBenefitAnalysis.jitImplementationCost).toBeGreaterThan(0);
      expect(result.costBenefitAnalysis.potentialSavings).toBeDefined();
      expect(result.costBenefitAnalysis.paybackPeriod).toBeGreaterThan(0);
      expect(result.costBenefitAnalysis.roi).toBeDefined();
    });

    it('should assess JIT implementation risks', async () => {
      const productId = 'prod-123';
      const mockProduct = { ...createTestProduct() };
      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          riskScore: 0.3,
          geopoliticalRisk: 0.2,
          naturalDisasterRisk: 0.1
        }
      ];

      productRepository.findOne.mockResolvedValue(mockProduct as any);
      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.analyzeJITFeasibility(productId);

      expect(result.riskAssessment.supplierRisk).toBeDefined();
      expect(result.riskAssessment.demandRisk).toBeDefined();
      expect(result.riskAssessment.operationalRisk).toBeDefined();
      expect(result.riskAssessment.overallRisk).toBeGreaterThan(0);
      expect(result.riskAssessment.mitigationStrategies).toBeInstanceOf(Array);
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate comprehensive optimization recommendations', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        {
          ...createTestInventoryItem(),
          id: 'item-1',
          product: { ...createTestProduct(), id: 'prod-1' },
          currentStock: 1000,
          reorderPoint: 200,
          orderQuantity: 500,
          averageDemand: 100,
          stockoutFrequency: 0.05,
          excessInventoryDays: 45,
          turnoverRate: 4.2
        },
        {
          ...createTestInventoryItem(),
          id: 'item-2',
          product: { ...createTestProduct(), id: 'prod-2' },
          currentStock: 50,
          reorderPoint: 100, // Below reorder point
          orderQuantity: 200,
          averageDemand: 80,
          stockoutFrequency: 0.15,
          excessInventoryDays: 10,
          turnoverRate: 12.0
        }
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.generateOptimizationRecommendations(warehouseId);

      expect(result).toBeDefined();
      expect(result.warehouseId).toBe(warehouseId);
      expect(result.totalItems).toBe(2);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should identify low stock situation for item-2
      const lowStockRec = result.recommendations.find(r =>
        r.type === 'low_stock' && r.itemId === 'item-2'
      );
      expect(lowStockRec).toBeDefined();
      expect(lowStockRec?.priority).toBe('high');

      // Should identify excess inventory for item-1
      const excessRec = result.recommendations.find(r =>
        r.type === 'excess_inventory' && r.itemId === 'item-1'
      );
      expect(excessRec).toBeDefined();

      expect(result.summaryMetrics).toBeDefined();
      expect(result.summaryMetrics.totalValue).toBeGreaterThan(0);
      expect(result.summaryMetrics.averageTurnover).toBeGreaterThan(0);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should prioritize recommendations correctly', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        {
          ...createTestInventoryItem(),
          id: 'critical-item',
          criticality: 'high',
          currentStock: 10,
          reorderPoint: 50,
          stockoutCostPerUnit: 1000
        },
        {
          ...createTestInventoryItem(),
          id: 'normal-item',
          criticality: 'medium',
          currentStock: 80,
          reorderPoint: 100,
          stockoutCostPerUnit: 50
        }
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.generateOptimizationRecommendations(warehouseId);

      const criticalRec = result.recommendations.find(r => r.itemId === 'critical-item');
      const normalRec = result.recommendations.find(r => r.itemId === 'normal-item');

      expect(criticalRec?.priority).toBe('critical');
      expect(normalRec?.priority).toBe('high');
      expect(result.recommendations[0].priority).toBe('critical'); // Should be sorted by priority
    });

    it('should calculate potential cost savings', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        {
          ...createTestInventoryItem(),
          currentStock: 1000,
          optimalStock: 600,
          carryingCostPerUnit: 5,
          orderQuantity: 500,
          optimalOrderQuantity: 300,
          orderingCost: 100
        }
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.generateOptimizationRecommendations(warehouseId);

      expect(result.costImpact).toBeDefined();
      expect(result.costImpact.potentialSavings).toBeGreaterThan(0);
      expect(result.costImpact.carryingCostReduction).toBeGreaterThan(0);
      expect(result.costImpact.orderingCostReduction).toBeGreaterThan(0);
      expect(result.costImpact.roi).toBeGreaterThan(0);
    });

    it('should identify slow-moving and obsolete inventory', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        {
          ...createTestInventoryItem(),
          id: 'slow-item',
          turnoverRate: 0.5, // Very slow
          lastMovementDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 180 days ago
          currentStock: 500,
          averageDemand: 1
        },
        {
          ...createTestInventoryItem(),
          id: 'obsolete-item',
          turnoverRate: 0,
          lastMovementDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
          currentStock: 100,
          averageDemand: 0
        }
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.generateOptimizationRecommendations(warehouseId);

      const slowMovingRec = result.recommendations.find(r =>
        r.type === 'slow_moving' && r.itemId === 'slow-item'
      );
      const obsoleteRec = result.recommendations.find(r =>
        r.type === 'obsolete_inventory' && r.itemId === 'obsolete-item'
      );

      expect(slowMovingRec).toBeDefined();
      expect(obsoleteRec).toBeDefined();
      expect(obsoleteRec?.action).toContain('liquidate');
    });

    it('should suggest reorder point adjustments', async () => {
      const warehouseId = 'warehouse-123';
      const mockInventoryItems = [
        {
          ...createTestInventoryItem(),
          id: 'item-1',
          reorderPoint: 50,
          averageDemand: 100,
          averageLeadTime: 7,
          stockoutFrequency: 0.2, // High stockout frequency
          serviceLevel: 0.80
        }
      ];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const result = await service.generateOptimizationRecommendations(warehouseId);

      const reorderRec = result.recommendations.find(r =>
        r.type === 'reorder_point_adjustment'
      );

      expect(reorderRec).toBeDefined();
      expect(reorderRec?.currentValue).toBe(50);
      expect(reorderRec?.recommendedValue).toBeGreaterThan(50); // Should increase due to stockouts
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      inventoryRepository.find.mockRejectedValue(error);

      await expect(service.performABCAnalysis('warehouse-123')).rejects.toThrow('Database connection failed');
      await expect(service.generateOptimizationRecommendations('warehouse-123')).rejects.toThrow('Database connection failed');
    });

    it('should validate input parameters', async () => {
      await expect(service.performABCAnalysis('')).rejects.toThrow();
      await expect(service.calculateSafetyStock('', {} as any)).rejects.toThrow();
      await expect(service.analyzeJITFeasibility(null as any)).rejects.toThrow();
    });

    it('should handle missing product data', async () => {
      productRepository.findOne.mockResolvedValue(null);

      await expect(service.calculateSafetyStock('non-existent', { method: 'statistical' }))
        .rejects.toThrow('Product not found');
      await expect(service.analyzeJITFeasibility('non-existent'))
        .rejects.toThrow('Product not found');
    });

    it('should handle invalid calculation parameters', async () => {
      const mockProduct = { ...createTestProduct() };
      productRepository.findOne.mockResolvedValue(mockProduct as any);

      const result = await service.calculateSafetyStock('prod-123', {
        method: 'statistical',
        serviceLevel: 1.5 // Invalid service level > 1
      });

      expect(result.serviceLevel).toBeLessThanOrEqual(1); // Should be normalized
    });
  });

  describe('Performance Tests', () => {
    it('should handle large inventory sets efficiently', async () => {
      const warehouseId = 'large-warehouse';
      const largeInventorySet = Array.from({ length: 1000 }, (_, i) => ({
        ...createTestInventoryItem(),
        id: `item-${i}`,
        annualUsageValue: Math.random() * 10000
      }));

      inventoryRepository.find.mockResolvedValue(largeInventorySet as any);

      const startTime = Date.now();
      const result = await service.performABCAnalysis(warehouseId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result.totalItems).toBe(1000);
    });

    it('should handle concurrent optimization requests', async () => {
      const warehouseIds = ['warehouse-1', 'warehouse-2', 'warehouse-3'];
      const mockInventoryItems = [createTestInventoryItem()];

      inventoryRepository.find.mockResolvedValue(mockInventoryItems as any);

      const promises = warehouseIds.map(id => service.generateOptimizationRecommendations(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.warehouseId).toBe(warehouseIds[index]);
      });
    });
  });
});