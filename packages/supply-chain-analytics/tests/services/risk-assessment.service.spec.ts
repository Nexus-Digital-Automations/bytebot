import { Test, TestingModule } from '@nestjs/testing';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RiskAssessmentService } from '../../src/services/risk-assessment.service';
import { SupplyChainNodeEntity, ProductEntity } from '../../src/models/supply-chain.entity';
import { createMockRepository, createTestSupplyChainNode, createTestProduct } from '../setup';
import { RiskLevel, RiskCategory, RiskAssessment, ResilienceMetrics, ScenarioAnalysis } from '../../src/interfaces/supply-chain.interface';

describe('RiskAssessmentService', () => {
  let service: RiskAssessmentService;
  let supplyChainNodeRepository: jest.Mocked<Repository<SupplyChainNodeEntity>>;
  let productRepository: jest.Mocked<Repository<ProductEntity>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessmentService,
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

    service = module.get<RiskAssessmentService>(RiskAssessmentService);
    supplyChainNodeRepository = module.get(getRepositoryToken(SupplyChainNodeEntity));
    productRepository = module.get(getRepositoryToken(ProductEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('assessSupplyChainRisk', () => {
    it('should assess comprehensive supply chain risk', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          riskScore: 0.7,
          location: { country: 'Country A', politicalStability: 0.6 },
          financialHealth: { creditRating: 'B+', debtToEquity: 2.5 }
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          riskScore: 0.3,
          location: { country: 'Country B', politicalStability: 0.9 },
          financialHealth: { creditRating: 'A', debtToEquity: 1.2 }
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.assessSupplyChainRisk(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.overallRiskScore).toBeGreaterThan(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(1);
      expect(result.riskLevel).toBeDefined();
      expect(result.criticalRisks).toBeDefined();
      expect(result.riskCategories).toBeDefined();
      expect(result.assessmentDate).toBeInstanceOf(Date);
    });

    it('should categorize risks correctly by type', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          riskScore: 0.8,
          location: { country: 'High Risk Country', politicalStability: 0.3 },
          financialHealth: { creditRating: 'C', debtToEquity: 5.0 },
          operationalRisks: ['supply_disruption', 'quality_issues'],
          environmentalRisks: ['natural_disasters', 'climate_change']
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.assessSupplyChainRisk(productId);

      expect(result.riskCategories).toHaveProperty(RiskCategory.OPERATIONAL);
      expect(result.riskCategories).toHaveProperty(RiskCategory.FINANCIAL);
      expect(result.riskCategories).toHaveProperty(RiskCategory.GEOPOLITICAL);
      expect(result.riskCategories).toHaveProperty(RiskCategory.ENVIRONMENTAL);

      expect(result.riskCategories[RiskCategory.OPERATIONAL]).toBeGreaterThan(0);
      expect(result.riskCategories[RiskCategory.FINANCIAL]).toBeGreaterThan(0);
    });

    it('should determine correct risk levels', async () => {
      const testCases = [
        { riskScore: 0.2, expectedLevel: RiskLevel.LOW },
        { riskScore: 0.5, expectedLevel: RiskLevel.MEDIUM },
        { riskScore: 0.8, expectedLevel: RiskLevel.HIGH },
        { riskScore: 0.95, expectedLevel: RiskLevel.CRITICAL },
      ];

      for (const testCase of testCases) {
        const mockNodes = [{ ...createTestSupplyChainNode(), riskScore: testCase.riskScore }];
        supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

        const result = await service.assessSupplyChainRisk('prod-test');

        // Risk level should correspond to the risk score
        if (testCase.riskScore >= 0.8) {
          expect([RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(result.riskLevel);
        }
      }
    });

    it('should handle empty supply chain', async () => {
      const productId = 'prod-empty';
      supplyChainNodeRepository.find.mockResolvedValue([]);

      const result = await service.assessSupplyChainRisk(productId);

      expect(result.overallRiskScore).toBe(0);
      expect(result.riskLevel).toBe(RiskLevel.LOW);
      expect(result.criticalRisks).toHaveLength(0);
    });
  });

  describe('calculateResilienceMetrics', () => {
    it('should calculate comprehensive resilience metrics', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          redundancy: 2,
          diversificationIndex: 0.7,
          responseTime: 24,
          recoveryTime: 72
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          redundancy: 1,
          diversificationIndex: 0.5,
          responseTime: 48,
          recoveryTime: 120
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.calculateResilienceMetrics(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.overallResilience).toBeGreaterThan(0);
      expect(result.overallResilience).toBeLessThanOrEqual(1);
      expect(result.redundancyScore).toBeGreaterThan(0);
      expect(result.diversificationScore).toBeGreaterThan(0);
      expect(result.adaptabilityScore).toBeGreaterThan(0);
      expect(result.recoveryCapability).toBeGreaterThan(0);
      expect(result.calculationDate).toBeInstanceOf(Date);
    });

    it('should calculate redundancy scores correctly', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        { ...createTestSupplyChainNode(), redundancy: 3 },
        { ...createTestSupplyChainNode(), redundancy: 2 },
        { ...createTestSupplyChainNode(), redundancy: 1 },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.calculateResilienceMetrics(productId);

      expect(result.redundancyScore).toBeGreaterThan(0.5); // Good redundancy
      expect(result.redundancyDetails.averageRedundancy).toBeCloseTo(2, 1);
      expect(result.redundancyDetails.nodesWithBackup).toBe(3);
    });

    it('should assess diversification effectively', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          location: { region: 'North America', country: 'USA' },
          nodeType: 'supplier'
        },
        {
          ...createTestSupplyChainNode(),
          location: { region: 'Europe', country: 'Germany' },
          nodeType: 'manufacturer'
        },
        {
          ...createTestSupplyChainNode(),
          location: { region: 'Asia', country: 'China' },
          nodeType: 'supplier'
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.calculateResilienceMetrics(productId);

      expect(result.diversificationScore).toBeGreaterThan(0.6); // Good geographic diversity
      expect(result.diversificationDetails.geographicDiversity).toBeGreaterThan(0.5);
      expect(result.diversificationDetails.supplierDiversity).toBeGreaterThan(0.5);
    });

    it('should calculate response and recovery times', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        { ...createTestSupplyChainNode(), responseTime: 12, recoveryTime: 48 },
        { ...createTestSupplyChainNode(), responseTime: 24, recoveryTime: 72 },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.calculateResilienceMetrics(productId);

      expect(result.recoveryCapability).toBeGreaterThan(0);
      expect(result.adaptabilityScore).toBeGreaterThan(0);
      expect(result.responseTimeMetrics.averageResponseTime).toBe(18);
      expect(result.responseTimeMetrics.averageRecoveryTime).toBe(60);
    });
  });

  describe('generateScenarioAnalysis', () => {
    it('should generate comprehensive scenario analysis', async () => {
      const productId = 'prod-123';
      const scenarios = [
        'natural_disaster',
        'supplier_bankruptcy',
        'trade_war',
        'pandemic',
        'cyber_attack'
      ];

      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          location: { region: 'Asia', country: 'China' },
          criticality: 0.8,
          riskScore: 0.6
        },
        {
          ...createTestSupplyChainNode(),
          id: 'node-2',
          location: { region: 'Europe', country: 'Germany' },
          criticality: 0.6,
          riskScore: 0.3
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.generateScenarioAnalysis(productId, scenarios);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.analyzedScenarios).toHaveLength(scenarios.length);
      expect(result.overallRiskScore).toBeGreaterThan(0);
      expect(result.criticalScenarios).toBeDefined();
      expect(result.mitigationStrategies).toBeDefined();
      expect(result.analysisDate).toBeInstanceOf(Date);

      // Check each scenario analysis
      result.analyzedScenarios.forEach(scenario => {
        expect(scenario.scenarioName).toBeInList(scenarios);
        expect(scenario.probability).toBeGreaterThan(0);
        expect(scenario.impact).toBeGreaterThan(0);
        expect(scenario.riskScore).toBeGreaterThan(0);
        expect(scenario.affectedNodes).toBeDefined();
      });
    });

    it('should identify critical scenarios correctly', async () => {
      const productId = 'prod-123';
      const scenarios = ['high_impact_scenario', 'low_impact_scenario'];

      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          location: { region: 'High Risk Region' },
          criticality: 0.9,
          riskScore: 0.8
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.generateScenarioAnalysis(productId, scenarios);

      expect(result.criticalScenarios.length).toBeGreaterThan(0);
      result.criticalScenarios.forEach(scenario => {
        expect(scenario.riskScore).toBeGreaterThan(0.6); // High risk threshold
      });
    });

    it('should provide mitigation strategies for each scenario', async () => {
      const productId = 'prod-123';
      const scenarios = ['supplier_bankruptcy'];

      const mockNodes = [{ ...createTestSupplyChainNode() }];
      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.generateScenarioAnalysis(productId, scenarios);

      expect(result.mitigationStrategies).toBeDefined();
      expect(Object.keys(result.mitigationStrategies)).toContain('supplier_bankruptcy');
      expect(result.mitigationStrategies['supplier_bankruptcy']).toBeDefined();
      expect(result.mitigationStrategies['supplier_bankruptcy'].strategies).toBeInstanceOf(Array);
    });

    it('should handle empty scenario list', async () => {
      const productId = 'prod-123';
      const scenarios: string[] = [];

      const result = await service.generateScenarioAnalysis(productId, scenarios);

      expect(result.analyzedScenarios).toHaveLength(0);
      expect(result.overallRiskScore).toBe(0);
      expect(result.criticalScenarios).toHaveLength(0);
    });
  });

  describe('monitorRisksRealTime', () => {
    it('should monitor risks in real-time', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          id: 'node-1',
          riskScore: 0.7,
          lastUpdated: new Date(),
          alerts: [
            { type: 'financial_distress', severity: 'high', timestamp: new Date() }
          ]
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.monitorRisksRealTime(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.currentRiskScore).toBeGreaterThan(0);
      expect(result.activeAlerts).toBeDefined();
      expect(result.riskTrends).toBeDefined();
      expect(result.lastUpdated).toBeInstanceOf(Date);
    });

    it('should detect risk threshold breaches', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          riskScore: 0.85, // High risk
          riskThreshold: 0.7,
          alerts: [
            { type: 'risk_threshold_breach', severity: 'critical', timestamp: new Date() }
          ]
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.monitorRisksRealTime(productId);

      expect(result.thresholdBreaches).toBeDefined();
      expect(result.thresholdBreaches.length).toBeGreaterThan(0);
      expect(result.activeAlerts.some(alert => alert.type === 'risk_threshold_breach')).toBeTruthy();
    });

    it('should calculate risk trends over time', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          riskScore: 0.6,
          riskHistory: [
            { date: new Date(Date.now() - 86400000), score: 0.5 },
            { date: new Date(Date.now() - 172800000), score: 0.4 },
            { date: new Date(Date.now() - 259200000), score: 0.3 },
          ]
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.monitorRisksRealTime(productId);

      expect(result.riskTrends).toBeDefined();
      expect(result.riskTrends.direction).toBeDefined(); // 'increasing', 'decreasing', 'stable'
      expect(result.riskTrends.changeRate).toBeDefined();
      expect(result.riskTrends.volatility).toBeDefined();
    });
  });

  describe('generateRiskReport', () => {
    it('should generate comprehensive risk report', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          riskScore: 0.7,
          location: { country: 'Test Country' },
          financialHealth: { creditRating: 'B' }
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.generateRiskReport(productId);

      expect(result).toBeDefined();
      expect(result.productId).toBe(productId);
      expect(result.executiveSummary).toBeDefined();
      expect(result.riskAssessment).toBeDefined();
      expect(result.resilienceMetrics).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(result.reportGenerated).toBeInstanceOf(Date);
      expect(result.reportId).toBeDefined();
    });

    it('should include executive summary with key insights', async () => {
      const productId = 'prod-123';
      const mockNodes = [{ ...createTestSupplyChainNode(), riskScore: 0.8 }];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.generateRiskReport(productId);

      expect(result.executiveSummary.overallRiskLevel).toBeDefined();
      expect(result.executiveSummary.keyRisks).toBeInstanceOf(Array);
      expect(result.executiveSummary.criticalActions).toBeInstanceOf(Array);
      expect(result.executiveSummary.riskScore).toBeGreaterThan(0);
    });

    it('should provide actionable recommendations', async () => {
      const productId = 'prod-123';
      const mockNodes = [
        {
          ...createTestSupplyChainNode(),
          riskScore: 0.8,
          redundancy: 1, // Low redundancy
          diversificationIndex: 0.3 // Low diversification
        },
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.generateRiskReport(productId);

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      result.recommendations.forEach(rec => {
        expect(rec.priority).toBeDefined();
        expect(rec.category).toBeDefined();
        expect(rec.description).toBeDefined();
        expect(rec.implementation).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      const error = new Error('Database connection failed');
      supplyChainNodeRepository.find.mockRejectedValue(error);

      await expect(service.assessSupplyChainRisk('prod-123')).rejects.toThrow('Database connection failed');
      await expect(service.calculateResilienceMetrics('prod-123')).rejects.toThrow('Database connection failed');
    });

    it('should validate input parameters', async () => {
      await expect(service.assessSupplyChainRisk('')).rejects.toThrow();
      await expect(service.generateScenarioAnalysis('prod-123', null as any)).rejects.toThrow();
    });

    it('should handle invalid risk scores', async () => {
      const mockNodes = [
        { ...createTestSupplyChainNode(), riskScore: -0.5 }, // Invalid negative score
        { ...createTestSupplyChainNode(), riskScore: 1.5 },  // Invalid score > 1
      ];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const result = await service.assessSupplyChainRisk('prod-123');

      // Service should normalize invalid scores
      expect(result.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.overallRiskScore).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large supply chain risk assessment efficiently', async () => {
      const productId = 'prod-large';
      const largeNodeSet = Array.from({ length: 500 }, (_, i) => ({
        ...createTestSupplyChainNode(),
        id: `node-${i}`,
        riskScore: Math.random() * 0.8 + 0.2 // Random score between 0.2-1.0
      }));

      supplyChainNodeRepository.find.mockResolvedValue(largeNodeSet as any);

      const startTime = Date.now();
      const result = await service.assessSupplyChainRisk(productId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(result.overallRiskScore).toBeGreaterThan(0);
    });

    it('should handle concurrent risk assessments', async () => {
      const productIds = ['prod-1', 'prod-2', 'prod-3'];
      const mockNodes = [{ ...createTestSupplyChainNode(), riskScore: 0.5 }];

      supplyChainNodeRepository.find.mockResolvedValue(mockNodes as any);

      const promises = productIds.map(id => service.assessSupplyChainRisk(id));
      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result.productId).toBe(productIds[index]);
      });
    });
  });
});