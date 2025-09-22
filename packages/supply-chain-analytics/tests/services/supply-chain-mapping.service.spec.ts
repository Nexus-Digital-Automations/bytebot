import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SupplyChainMappingService } from '../../src/services/supply-chain-mapping.service';
import { SupplyChainNodeEntity, ProductEntity, InventoryItemEntity } from '../../src/models/supply-chain.entity';
import { createMockRepository, createTestSupplyChainNode, createTestProduct } from '../setup';
import { TierLevel, NodeType, SupplyChainMap, TierAnalysis } from '../../src/interfaces/supply-chain.interface';

describe('SupplyChainMappingService', () => {
  let service: SupplyChainMappingService;
  let supplyChainNodeRepository: jest.Mocked<Repository<SupplyChainNodeEntity>>;
  let productRepository: jest.Mocked<Repository<ProductEntity>>;
  let inventoryRepository: jest.Mocked<Repository<InventoryItemEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupplyChainMappingService,
        {
          provide: getRepositoryToken(SupplyChainNodeEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(ProductEntity),
          useValue: createMockRepository(),
        },
        {
          provide: getRepositoryToken(InventoryItemEntity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<SupplyChainMappingService>(SupplyChainMappingService);
    supplyChainNodeRepository = module.get(getRepositoryToken(SupplyChainNodeEntity));
    productRepository = module.get(getRepositoryToken(ProductEntity));
    inventoryRepository = module.get(getRepositoryToken(InventoryItemEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('generateMap', () => {
    it('should generate complete supply chain map with all tiers', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        { ...createTestSupplyChainNode(), id: 'node-1', nodeType: NodeType.MANUFACTURER, tierLevel: TierLevel.TIER_1 },
        { ...createTestSupplyChainNode(), id: 'node-2', nodeType: NodeType.SUPPLIER, tierLevel: TierLevel.TIER_2 },
        { ...createTestSupplyChainNode(), id: 'node-3', nodeType: NodeType.RAW_MATERIAL, tierLevel: TierLevel.TIER_3 },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as SupplyChainNodeEntity[]);

      const result = await service.generateMap(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.totalNodes).toBe(3);
      expect(result.tierCount).toBe(3);
      expect(result.nodes).toHaveLength(3);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(supplyChainNodeRepository.find).toHaveBeenCalledWith({
        where: { products: { id: productId } },
        relations: ['products', 'upstreamNodes', 'downstreamNodes'],
      });
    });

    it('should handle empty supply chain for product', async () => {
      const productId = 'prod-empty';
      supplyChainNodeRepository.find.mockResolvedValue([]);

      const result = await service.generateMap(productId);

      expect(result.totalNodes).toBe(0);
      expect(result.tierCount).toBe(0);
      expect(result.nodes).toHaveLength(0);
      expect(result.relationships).toHaveLength(0);
    });

    it('should calculate correct tier statistics', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_1, nodeType: NodeType.MANUFACTURER },
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_1, nodeType: NodeType.DISTRIBUTOR },
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_2, nodeType: NodeType.SUPPLIER },
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_3, nodeType: NodeType.RAW_MATERIAL },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as SupplyChainNodeEntity[]);

      const result = await service.generateMap(productId);

      expect(result.tierStatistics).toBeDefined();
      expect(result.tierStatistics[TierLevel.TIER_1]).toBe(2);
      expect(result.tierStatistics[TierLevel.TIER_2]).toBe(1);
      expect(result.tierStatistics[TierLevel.TIER_3]).toBe(1);
    });

    it('should handle database errors gracefully', async () => {
      const productId = 'prod-error';
      supplyChainNodeRepository.find.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.generateMap(productId)).rejects.toThrow('Database connection failed');
    });
  });

  describe('getVisibilityMetrics', () => {
    it('should calculate comprehensive visibility metrics', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        { ...createTestSupplyChainNode(), dataCompleteness: 0.95, lastUpdated: new Date() },
        { ...createTestSupplyChainNode(), dataCompleteness: 0.87, lastUpdated: new Date(Date.now() - 86400000) },
        { ...createTestSupplyChainNode(), dataCompleteness: 0.92, lastUpdated: new Date() },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as SupplyChainNodeEntity[]);

      const result = await service.getVisibilityMetrics(productId);

      expect(result).toBeDefined();
      expect(result.overallVisibility).toBeCloseTo(0.913, 2);
      expect(result.dataCompleteness).toBeCloseTo(0.913, 2);
      expect(result.mappedNodes).toBe(3);
      expect(result.lastUpdated).toBeInstanceOf(Date);
      expect(result.qualityScore).toBeGreaterThan(0);
      expect(result.qualityScore).toBeLessThanOrEqual(100);
    });

    it('should handle empty supply chain visibility metrics', async () => {
      const productId = 'prod-empty';
      supplyChainNodeRepository.find.mockResolvedValue([]);

      const result = await service.getVisibilityMetrics(productId);

      expect(result.overallVisibility).toBe(0);
      expect(result.dataCompleteness).toBe(0);
      expect(result.mappedNodes).toBe(0);
      expect(result.qualityScore).toBe(0);
    });

    it('should calculate tier-specific visibility scores', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_1, dataCompleteness: 0.95 },
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_2, dataCompleteness: 0.80 },
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_3, dataCompleteness: 0.65 },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as SupplyChainNodeEntity[]);

      const result = await service.getVisibilityMetrics(productId);

      expect(result.tierVisibility).toBeDefined();
      expect(result.tierVisibility[TierLevel.TIER_1]).toBeCloseTo(0.95, 2);
      expect(result.tierVisibility[TierLevel.TIER_2]).toBeCloseTo(0.80, 2);
      expect(result.tierVisibility[TierLevel.TIER_3]).toBeCloseTo(0.65, 2);
    });
  });

  describe('discoverTiers', () => {
    it('should discover and analyze all supply chain tiers', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'tier1-1',
          tierLevel: TierLevel.TIER_1,
          nodeType: NodeType.MANUFACTURER,
          upstreamNodes: [{ id: 'tier2-1' }],
          downstreamNodes: []
        },
        {
          ...createTestSupplyChainNode(),
          id: 'tier2-1',
          tierLevel: TierLevel.TIER_2,
          nodeType: NodeType.SUPPLIER,
          upstreamNodes: [{ id: 'tier3-1' }],
          downstreamNodes: [{ id: 'tier1-1' }]
        },
        {
          ...createTestSupplyChainNode(),
          id: 'tier3-1',
          tierLevel: TierLevel.TIER_3,
          nodeType: NodeType.RAW_MATERIAL,
          upstreamNodes: [],
          downstreamNodes: [{ id: 'tier2-1' }]
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.discoverTiers(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.discoveredTiers).toBe(3);
      expect(result.tierAnalysis).toHaveLength(3);

      const tier1Analysis = result.tierAnalysis.find(t => t.tierLevel === TierLevel.TIER_1);
      expect(tier1Analysis?.nodeCount).toBe(1);
      expect(tier1Analysis?.primaryNodeTypes).toContain(NodeType.MANUFACTURER);
    });

    it('should calculate tier dependencies correctly', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          tierLevel: TierLevel.TIER_1,
          upstreamNodes: [{ id: 'tier2-1' }, { id: 'tier2-2' }],
        },
        {
          ...createTestSupplyChainNode(),
          tierLevel: TierLevel.TIER_2,
          upstreamNodes: [{ id: 'tier3-1' }],
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.discoverTiers(productId);

      const tier1Analysis = result.tierAnalysis.find(t => t.tierLevel === TierLevel.TIER_1);
      expect(tier1Analysis?.averageDependencies).toBe(2);
    });

    it('should handle single-tier supply chains', async () => {
      const productId = 'prod-single';
      const mockNodes = [
        { ...createTestSupplyChainNode(), tierLevel: TierLevel.TIER_1, nodeType: NodeType.MANUFACTURER },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as SupplyChainNodeEntity[]);

      const result = await service.discoverTiers(productId);

      expect(result.discoveredTiers).toBe(1);
      expect(result.tierAnalysis).toHaveLength(1);
      expect(result.criticalPath).toHaveLength(1);
    });
  });

  describe('analyzeDependencies', () => {
    it('should analyze supply chain dependencies comprehensively', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          upstreamNodes: [{ id: 'node-2' }, { id: 'node-3' }],
          downstreamNodes: [],
          riskScore: 0.3
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          upstreamNodes: [],
          downstreamNodes: [{ id: 'node-1' }],
          riskScore: 0.5
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-3',
          upstreamNodes: [],
          downstreamNodes: [{ id: 'node-1' }],
          riskScore: 0.7
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.analyzeDependencies(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.totalDependencies).toBe(2);
      expect(result.criticalDependencies).toBeGreaterThan(0);
      expect(result.dependencyMatrix).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
    });

    it('should identify single points of failure', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          upstreamNodes: [{ id: 'node-2' }],
          downstreamNodes: [],
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          upstreamNodes: [],
          downstreamNodes: [{ id: 'node-1' }],
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.analyzeDependencies(productId);

      expect(result.singlePointsOfFailure).toContain('node-2');
      expect(result.riskAssessment.overallRisk).toBeGreaterThan(0);
    });

    it('should calculate dependency resilience score', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          upstreamNodes: [{ id: 'alt1' }, { id: 'alt2' }, { id: 'alt3' }],
          riskScore: 0.2
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.analyzeDependencies(productId);

      expect(result.resilienceScore).toBeGreaterThan(0.5);
      expect(result.diversificationIndex).toBeGreaterThan(0);
    });
  });

  describe('findAlternativeSuppliers', () => {
    it('should find alternative suppliers based on criteria', async () => {
      const nodeId = 'node-123';
      const criteria = {
        maxDistance: 1000,
        minCapacity: 10000,
        requiredCertifications: ['ISO9001'],
        maxRiskScore: 0.5,
        preferredRegions: ['North America']
      };

      const mockAlternatives = [
        {
          ...createTestSupplyChainNode(),
          id: 'alt-1',
          nodeType: NodeType.SUPPLIER,
          capacity: 15000,
          certifications: ['ISO9001', 'ISO14001'],
          riskScore: 0.3,
          location: { region: 'North America', distance: 500 }
        },
        {
          ...createTestSupplyChainNode(),
          id: 'alt-2',
          nodeType: NodeType.SUPPLIER,
          capacity: 12000,
          certifications: ['ISO9001'],
          riskScore: 0.4,
          location: { region: 'North America', distance: 750 }
        },
      ];

      supplyChainNodeRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlternatives),
      } as any);

      const result = await service.findAlternativeSuppliers(nodeId, criteria);

      expect(result).toBeDefined();
      expect(result.nodeId).toBe(nodeId);
      expect(result.alternatives).toHaveLength(2);
      expect(result.alternatives[0].compatibilityScore).toBeGreaterThan(0);
      expect(result.searchCriteria).toEqual(criteria);
    });

    it('should handle no alternatives found', async () => {
      const nodeId = 'node-123';
      const criteria = { maxRiskScore: 0.1 };

      supplyChainNodeRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      } as any);

      const result = await service.findAlternativeSuppliers(nodeId, criteria);

      expect(result.alternatives).toHaveLength(0);
      expect(result.totalFound).toBe(0);
      expect(result.averageCompatibility).toBe(0);
    });

    it('should calculate compatibility scores accurately', async () => {
      const nodeId = 'node-123';
      const criteria = {
        maxRiskScore: 0.5,
        minCapacity: 10000,
        requiredCertifications: ['ISO9001']
      };

      const mockAlternatives = [
        {
          ...createTestSupplyChainNode(),
          capacity: 20000,
          riskScore: 0.2,
          certifications: ['ISO9001', 'ISO14001'],
          qualityScore: 0.9
        },
      ];

      supplyChainNodeRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(mockAlternatives),
      } as any);

      const result = await service.findAlternativeSuppliers(nodeId, criteria);

      expect(result.alternatives[0].compatibilityScore).toBeGreaterThan(0.8);
      expect(result.averageCompatibility).toBeGreaterThan(0.8);
    });
  });

  describe('updateMapData', () => {
    it('should update supply chain map data successfully', async () => {
      const productId = 'prod-123';
      const updateData = {
        nodeUpdates: [
          { nodeId: 'node-1', dataCompleteness: 0.95, lastVerified: new Date() }
        ],
        newRelationships: [
          { upstreamNodeId: 'node-1', downstreamNodeId: 'node-2', relationshipType: 'supplier' }
        ]
      };

      supplyChainNodeRepository.update.mockResolvedValue({ affected: 1 } as any);
      supplyChainNodeRepository.save.mockResolvedValue({} as any);

      const result = await service.updateMapData(productId, updateData);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.updatedNodes).toBe(1);
      expect(result.newRelationships).toBe(1);
      expect(result.updateTimestamp).toBeInstanceOf(Date);
      expect(supplyChainNodeRepository.update).toHaveBeenCalled();
    });

    it('should handle update failures gracefully', async () => {
      const productId = 'prod-123';
      const updateData = { nodeUpdates: [], newRelationships: [] };

      supplyChainNodeRepository.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.updateMapData(productId, updateData)).rejects.toThrow('Update failed');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors in all methods', async () => {
      const error = new Error('Repository error');
      supplyChainNodeRepository.find.mockRejectedValue(error);

      await expect(service.generateMap('prod-123')).rejects.toThrow('Repository error');
      await expect(service.getVisibilityMetrics('prod-123')).rejects.toThrow('Repository error');
      await expect(service.discoverTiers('prod-123')).rejects.toThrow('Repository error');
      await expect(service.analyzeDependencies('prod-123')).rejects.toThrow('Repository error');
    });

    it('should validate input parameters', async () => {
      await expect(service.generateMap('')).rejects.toThrow();
      await expect(service.getVisibilityMetrics(null as any)).rejects.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle large supply chains efficiently', async () => {
      const productId = 'prod-large';
      const largeNodeSet = Array.from({ length: 1000 }, (_, i) => ({
        ...createTestSupplyChainNode(),
        id: `node-${i}`,
        tierLevel: i % 3 === 0 ? TierLevel.TIER_1 : i % 3 === 1 ? TierLevel.TIER_2 : TierLevel.TIER_3
      }));

      supplyChainNodeRepository.find.mockResolvedValue(largeNodeSet as SupplyChainNodeEntity[]);

      const startTime = Date.now();
      const result = await service.generateMap(productId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.totalNodes).toBe(1000);
    });

    it('should handle concurrent requests efficiently', async () => {
      const productIds = ['prod-1', 'prod-2', 'prod-3'];
      const mockNodes = [createTestSupplyChainNode()];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as SupplyChainNodeEntity[]);

      const promises = productIds.map(id => service.generateMap(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.productId).toBe(productIds[index]);
      });
    });
  });
});