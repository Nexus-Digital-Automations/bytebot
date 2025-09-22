import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PerformanceAnalyticsService } from '../../src/services/performance-analytics.service';
import { SupplyChainNodeEntity, ProductEntity } from '../../src/models/supply-chain.entity';
import { createMockRepository, createTestSupplyChainNode, createTestProduct } from '../setup';
import { PerformanceScorecard, BenchmarkingAnalysis, TrendAnalysis, SupplierRanking } from '../../src/interfaces/supply-chain.interface';

describe('PerformanceAnalyticsService', () => {
  let service: PerformanceAnalyticsService;
  let supplyChainNodeRepository: jest.Mocked<Repository<SupplyChainNodeEntity>>;
  let productRepository: jest.Mocked<Repository<ProductEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PerformanceAnalyticsService,
        {
          provide: getRepositoryToken(SupplyChainNodeEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<PerformanceAnalyticsService>(PerformanceAnalyticsService);
    supplyChainNodeRepository = module.get(getRepositoryToken(SupplyChainNodeEntity));
    productRepository = module.get(getRepositoryToken(ProductEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSupplierScorecard', () => {
    it('should generate comprehensive supplier scorecard', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        id: supplierId,
        qualityScore: 0.92,
        deliveryPerformance: 0.88,
        costEfficiency: 0.85,
        responsiveness: 0.90,
        innovation: 0.75,
        sustainability: 0.80,
        riskScore: 0.25,
        certifications: ['ISO9001', 'ISO14001'],
        performanceHistory: [
          { date: new Date('2024-01-01'), qualityScore: 0.90, deliveryScore: 0.85 },
          { date: new Date('2024-02-01'), qualityScore: 0.91, deliveryScore: 0.87 },
          { date: new Date('2024-03-01'), qualityScore: 0.92, deliveryScore: 0.88 },
        ]
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.generateSupplierScorecard(supplierId);

      expect(result).toBeDefined();
      expect(result.supplierId).toBe(supplierId);
      expect(result.overallScore).toBeGreaterThan(0.8);
      expect(result.categories).toBeDefined();
      expect(result.categories.quality).toBeCloseTo(0.92, 2);
      expect(result.categories.delivery).toBeCloseTo(0.88, 2);
      expect(result.categories.cost).toBeCloseTo(0.85, 2);
      expect(result.categories.responsiveness).toBeCloseTo(0.90, 2);
      expect(result.categories.innovation).toBeCloseTo(0.75, 2);
      expect(result.categories.sustainability).toBeCloseTo(0.80, 2);
      expect(result.performanceTrends).toBeDefined();
      expect(result.strengths).toBeInstanceOf(Array);
      expect(result.improvementAreas).toBeInstanceOf(Array);
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should calculate weighted overall score correctly', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        qualityScore: 0.90, // Weight: 25%
        deliveryPerformance: 0.80, // Weight: 20%
        costEfficiency: 0.70, // Weight: 20%
        responsiveness: 0.85, // Weight: 15%
        innovation: 0.60, // Weight: 10%
        sustainability: 0.75, // Weight: 10%
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.generateSupplierScorecard(supplierId);

      // Expected weighted score: 0.90*0.25 + 0.80*0.20 + 0.70*0.20 + 0.85*0.15 + 0.60*0.10 + 0.75*0.10
      const expectedScore = 0.90 * 0.25 + 0.80 * 0.20 + 0.70 * 0.20 + 0.85 * 0.15 + 0.60 * 0.10 + 0.75 * 0.10;
      expect(result.overallScore).toBeCloseTo(expectedScore, 2);
    });

    it('should identify strengths and improvement areas correctly', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        qualityScore: 0.95, // Strength
        deliveryPerformance: 0.45, // Improvement area
        costEfficiency: 0.85,
        responsiveness: 0.92, // Strength
        innovation: 0.40, // Improvement area
        sustainability: 0.88,
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.generateSupplierScorecard(supplierId);

      expect(result.strengths).toContain('quality');
      expect(result.strengths).toContain('responsiveness');
      expect(result.improvementAreas).toContain('delivery');
      expect(result.improvementAreas).toContain('innovation');
    });

    it('should handle supplier not found', async () => {
      const supplierId = 'non-existent';
      supplyChainNodeRepository.findOne.mockResolvedValue(null);

      await expect(service.generateSupplierScorecard(supplierId)).rejects.toThrow('Supplier not found');
    });

    it('should handle missing performance data gracefully', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        // Missing some performance metrics
        qualityScore: 0.85,
        deliveryPerformance: undefined,
        costEfficiency: null,
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.generateSupplierScorecard(supplierId);

      expect(result).toBeDefined();
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.categories.delivery).toBe(0); // Default value for missing data
      expect(result.categories.cost).toBe(0);
    });
  });

  describe('performBenchmarking', () => {
    it('should perform comprehensive benchmarking analysis', async () => {
      const supplierIds = ['supplier-1', 'supplier-2', 'supplier-3'];
      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-1',
          qualityScore: 0.90,
          deliveryPerformance: 0.85,
          costEfficiency: 0.80,
          overallScore: 0.85
        },
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-2',
          qualityScore: 0.95,
          deliveryPerformance: 0.90,
          costEfficiency: 0.85,
          overallScore: 0.90
        },
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-3',
          qualityScore: 0.80,
          deliveryPerformance: 0.75,
          costEfficiency: 0.90,
          overallScore: 0.82
        },
      ];

      supplyChainNodeRepository.findByIds.mockResolvedValue(mockSuppliers as any);

      const result = await service.performBenchmarking(supplierIds);

      expect(result).toBeDefined();
      expect(result.supplierCount).toBe(3);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.quality.average).toBeCloseTo(0.883, 2);
      expect(result.metrics.quality.median).toBeCloseTo(0.90, 2);
      expect(result.metrics.quality.best).toBeCloseTo(0.95, 2);
      expect(result.metrics.quality.worst).toBeCloseTo(0.80, 2);
      expect(result.rankings).toHaveLength(3);
      expect(result.industryComparison).toBeDefined();
      expect(result.analysisDate).toBeInstanceOf(Date);
    });

    it('should rank suppliers correctly by overall performance', async () => {
      const supplierIds = ['supplier-1', 'supplier-2', 'supplier-3'];
      const mockSuppliers = [
        { ...createTestSupplyChainNode(), id: 'supplier-1', overallScore: 0.75 },
        { ...createTestSupplyChainNode(), id: 'supplier-2', overallScore: 0.90 },
        { ...createTestSupplyChainNode(), id: 'supplier-3', overallScore: 0.85 },
      ];

      supplyChainNodeRepository.findByIds.mockResolvedValue(mockSuppliers as any);

      const result = await service.performBenchmarking(supplierIds);

      expect(result.rankings[0].supplierId).toBe('supplier-2'); // Highest score
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].supplierId).toBe('supplier-3'); // Second highest
      expect(result.rankings[1].rank).toBe(2);
      expect(result.rankings[2].supplierId).toBe('supplier-1'); // Lowest score
      expect(result.rankings[2].rank).toBe(3);
    });

    it('should calculate percentile rankings correctly', async () => {
      const supplierIds = ['supplier-1', 'supplier-2', 'supplier-3', 'supplier-4'];
      const mockSuppliers = [
        { ...createTestSupplyChainNode(), id: 'supplier-1', overallScore: 0.60 },
        { ...createTestSupplyChainNode(), id: 'supplier-2', overallScore: 0.70 },
        { ...createTestSupplyChainNode(), id: 'supplier-3', overallScore: 0.80 },
        { ...createTestSupplyChainNode(), id: 'supplier-4', overallScore: 0.90 },
      ];

      supplyChainNodeRepository.findByIds.mockResolvedValue(mockSuppliers as any);

      const result = await service.performBenchmarking(supplierIds);

      // Top performer should be in 100th percentile
      const topPerformer = result.rankings.find(r => r.rank === 1);
      expect(topPerformer?.percentile).toBeCloseTo(100, 0);

      // Bottom performer should be in lower percentile
      const bottomPerformer = result.rankings.find(r => r.rank === 4);
      expect(bottomPerformer?.percentile).toBeLessThan(50);
    });

    it('should handle empty supplier list', async () => {
      const result = await service.performBenchmarking([]);

      expect(result.supplierCount).toBe(0);
      expect(result.rankings).toHaveLength(0);
      expect(Object.values(result.metrics.quality)).toContain(0);
    });

    it('should provide industry comparison insights', async () => {
      const supplierIds = ['supplier-1'];
      const mockSuppliers = [
        { ...createTestSupplyChainNode(), id: 'supplier-1', overallScore: 0.85 }
      ];

      supplyChainNodeRepository.findByIds.mockResolvedValue(mockSuppliers as any);

      const result = await service.performBenchmarking(supplierIds);

      expect(result.industryComparison).toBeDefined();
      expect(result.industryComparison.industryAverage).toBeGreaterThan(0);
      expect(result.industryComparison.topQuartile).toBeGreaterThan(0);
      expect(result.industryComparison.median).toBeGreaterThan(0);
    });
  });

  describe('analyzeTrends', () => {
    it('should analyze performance trends over time', async () => {
      const supplierId = 'supplier-123';
      const timeRange = { startDate: new Date('2024-01-01'), endDate: new Date('2024-06-01') };

      const mockSupplier = {
        ...createTestSupplyChainNode(),
        id: supplierId,
        performanceHistory: [
          { date: new Date('2024-01-01'), qualityScore: 0.80, deliveryScore: 0.75, overallScore: 0.78 },
          { date: new Date('2024-02-01'), qualityScore: 0.82, deliveryScore: 0.78, overallScore: 0.80 },
          { date: new Date('2024-03-01'), qualityScore: 0.85, deliveryScore: 0.80, overallScore: 0.83 },
          { date: new Date('2024-04-01'), qualityScore: 0.87, deliveryScore: 0.83, overallScore: 0.85 },
          { date: new Date('2024-05-01'), qualityScore: 0.90, deliveryScore: 0.85, overallScore: 0.88 },
        ]
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.analyzeTrends(supplierId, timeRange);

      expect(result).toBeDefined();
      expect(result.supplierId).toBe(supplierId);
      expect(result.timeRange).toEqual(timeRange);
      expect(result.overallTrend.direction).toBe('improving');
      expect(result.overallTrend.changeRate).toBeGreaterThan(0);
      expect(result.categoryTrends).toBeDefined();
      expect(result.categoryTrends.quality.direction).toBe('improving');
      expect(result.categoryTrends.delivery.direction).toBe('improving');
      expect(result.volatility).toBeDefined();
      expect(result.forecast).toBeDefined();
    });

    it('should detect declining performance trends', async () => {
      const supplierId = 'supplier-123';
      const timeRange = { startDate: new Date('2024-01-01'), endDate: new Date('2024-06-01') };

      const mockSupplier = {
        ...createTestSupplyChainNode(),
        performanceHistory: [
          { date: new Date('2024-01-01'), overallScore: 0.90 },
          { date: new Date('2024-02-01'), overallScore: 0.85 },
          { date: new Date('2024-03-01'), overallScore: 0.80 },
          { date: new Date('2024-04-01'), overallScore: 0.75 },
          { date: new Date('2024-05-01'), overallScore: 0.70 },
        ]
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.analyzeTrends(supplierId, timeRange);

      expect(result.overallTrend.direction).toBe('declining');
      expect(result.overallTrend.changeRate).toBeLessThan(0);
      expect(result.alerts).toBeDefined();
      expect(result.alerts.some(alert => alert.type === 'performance_decline')).toBeTruthy();
    });

    it('should calculate trend volatility correctly', async () => {
      const supplierId = 'supplier-123';
      const timeRange = { startDate: new Date('2024-01-01'), endDate: new Date('2024-06-01') };

      const mockSupplier = {
        ...createTestSupplyChainNode(),
        performanceHistory: [
          { date: new Date('2024-01-01'), overallScore: 0.80 },
          { date: new Date('2024-02-01'), overallScore: 0.95 }, // High volatility
          { date: new Date('2024-03-01'), overallScore: 0.70 },
          { date: new Date('2024-04-01'), overallScore: 0.90 },
          { date: new Date('2024-05-01'), overallScore: 0.65 },
        ]
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.analyzeTrends(supplierId, timeRange);

      expect(result.volatility.overall).toBeGreaterThan(0.1); // High volatility
      expect(result.volatility.level).toBe('high');
    });

    it('should provide performance forecasting', async () => {
      const supplierId = 'supplier-123';
      const timeRange = { startDate: new Date('2024-01-01'), endDate: new Date('2024-06-01') };

      const mockSupplier = {
        ...createTestSupplyChainNode(),
        performanceHistory: [
          { date: new Date('2024-01-01'), overallScore: 0.80 },
          { date: new Date('2024-02-01'), overallScore: 0.82 },
          { date: new Date('2024-03-01'), overallScore: 0.84 },
          { date: new Date('2024-04-01'), overallScore: 0.86 },
          { date: new Date('2024-05-01'), overallScore: 0.88 },
        ]
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.analyzeTrends(supplierId, timeRange);

      expect(result.forecast).toBeDefined();
      expect(result.forecast.nextPeriod).toBeGreaterThan(0.88); // Should predict improvement
      expect(result.forecast.confidence).toBeGreaterThan(0);
      expect(result.forecast.confidence).toBeLessThanOrEqual(1);
      expect(result.forecast.method).toBeDefined();
    });

    it('should handle insufficient historical data', async () => {
      const supplierId = 'supplier-123';
      const timeRange = { startDate: new Date('2024-01-01'), endDate: new Date('2024-06-01') };

      const mockSupplier = {
        ...createTestSupplyChainNode(),
        performanceHistory: [
          { date: new Date('2024-01-01'), overallScore: 0.80 },
        ] // Only one data point
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.analyzeTrends(supplierId, timeRange);

      expect(result.overallTrend.direction).toBe('insufficient_data');
      expect(result.forecast.confidence).toBeLessThan(0.5); // Low confidence
    });
  });

  describe('generateRankings', () => {
    it('should generate comprehensive supplier rankings', async () => {
      const criteria = {
        category: 'overall' as const,
        weights: {
          quality: 0.3,
          delivery: 0.25,
          cost: 0.25,
          sustainability: 0.2
        },
        filters: {
          minCertifications: 1,
          maxRiskScore: 0.5
        }
      };

      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-1',
          qualityScore: 0.90,
          deliveryPerformance: 0.85,
          costEfficiency: 0.80,
          sustainability: 0.75,
          certifications: ['ISO9001'],
          riskScore: 0.3
        },
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-2',
          qualityScore: 0.85,
          deliveryPerformance: 0.90,
          costEfficiency: 0.85,
          sustainability: 0.80,
          certifications: ['ISO9001', 'ISO14001'],
          riskScore: 0.2
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.generateRankings(criteria);

      expect(result).toBeDefined();
      expect(result.category).toBe('overall');
      expect(result.rankings).toHaveLength(2);
      expect(result.criteria).toEqual(criteria);
      expect(result.totalSuppliers).toBe(2);
      expect(result.rankings[0].rank).toBe(1);
      expect(result.rankings[1].rank).toBe(2);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should apply filters correctly', async () => {
      const criteria = {
        category: 'quality' as const,
        filters: {
          minQualityScore: 0.85,
          requiredCertifications: ['ISO9001'],
          maxRiskScore: 0.4
        }
      };

      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-1',
          qualityScore: 0.90, // Passes
          certifications: ['ISO9001'],
          riskScore: 0.3
        },
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-2',
          qualityScore: 0.80, // Fails quality filter
          certifications: ['ISO9001'],
          riskScore: 0.3
        },
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-3',
          qualityScore: 0.90, // Fails certification filter
          certifications: ['ISO14001'],
          riskScore: 0.3
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.generateRankings(criteria);

      expect(result.rankings).toHaveLength(1);
      expect(result.rankings[0].supplierId).toBe('supplier-1');
    });

    it('should calculate weighted scores correctly', async () => {
      const criteria = {
        category: 'overall' as const,
        weights: {
          quality: 0.4,
          delivery: 0.3,
          cost: 0.2,
          sustainability: 0.1
        }
      };

      const mockSuppliers = [
        {
          ...createTestSupplyChainNode(),
          id: 'supplier-1',
          qualityScore: 1.0,
          deliveryPerformance: 0.8,
          costEfficiency: 0.6,
          sustainability: 0.4
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.generateRankings(criteria);

      // Expected: 1.0*0.4 + 0.8*0.3 + 0.6*0.2 + 0.4*0.1 = 0.8
      expect(result.rankings[0].weightedScore).toBeCloseTo(0.8, 2);
    });

    it('should handle category-specific rankings', async () => {
      const criteria = { category: 'sustainability' as const };

      const mockSuppliers = [
        { ...createTestSupplyChainNode(), id: 'supplier-1', sustainability: 0.90 },
        { ...createTestSupplyChainNode(), id: 'supplier-2', sustainability: 0.85 },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockSuppliers as any);

      const result = await service.generateRankings(criteria);

      expect(result.category).toBe('sustainability');
      expect(result.rankings[0].categoryScore).toBeCloseTo(0.90, 2);
      expect(result.rankings[1].categoryScore).toBeCloseTo(0.85, 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      supplyChainNodeRepository.findOne.mockRejectedValue(error);

      await expect(service.generateSupplierScorecard('supplier-123')).rejects.toThrow('Database connection failed');
    });

    it('should validate input parameters', async () => {
      await expect(service.generateSupplierScorecard('')).rejects.toThrow();
      await expect(service.performBenchmarking(null as any)).rejects.toThrow();
      await expect(service.analyzeTrends('supplier-123', null as any)).rejects.toThrow();
    });

    it('should handle malformed performance data', async () => {
      const supplierId = 'supplier-123';
      const mockSupplier = {
        ...createTestSupplyChainNode(),
        qualityScore: 'invalid', // Invalid data type
        deliveryPerformance: null,
        performanceHistory: 'not_an_array'
      };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const result = await service.generateSupplierScorecard(supplierId);

      expect(result).toBeDefined();
      expect(result.categories.quality).toBe(0); // Should default to 0
      expect(result.categories.delivery).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large benchmarking sets efficiently', async () => {
      const supplierIds = Array.from({ length: 100 }, (_, i) => `supplier-${i}`);
      const mockSuppliers = supplierIds.map(id => ({
        ...createTestSupplyChainNode(),
        id,
        overallScore: Math.random()
      }));

      supplyChainNodeRepository.findByIds.mockResolvedValue(mockSuppliers as any);

      const startTime = Date.now();
      const result = await service.performBenchmarking(supplierIds);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(result.supplierCount).toBe(100);
      expect(result.rankings).toHaveLength(100);
    });

    it('should handle concurrent scorecard generation', async () => {
      const supplierIds = ['supplier-1', 'supplier-2', 'supplier-3'];
      const mockSupplier = { ...createTestSupplyChainNode(), qualityScore: 0.85 };

      supplyChainNodeRepository.findOne.mockResolvedValue(mockSupplier as any);

      const promises = supplierIds.map(id => service.generateSupplierScorecard(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.supplierId).toBe(supplierIds[index]);
      });
    });
  });
});