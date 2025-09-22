/**
 * Supply Chain Analytics Platform - Core Interfaces
 * Enterprise-grade TypeScript interfaces for supply chain data modeling
 */

import { Transform } from 'class-transformer';
import { IsString, IsNumber, IsDate, IsOptional, IsArray, IsBoolean, ValidateNested, Min, Max } from 'class-validator';

/**
 * Geographic location interface for supply chain nodes
 */
export interface GeographicLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  timezone: string;
}

/**
 * Supplier performance metrics interface
 */
export interface SupplierPerformanceMetrics {
  supplierId: string;
  onTimeDeliveryRate: number; // 0-100 percentage
  qualityScore: number; // 0-100 score
  costCompetitiveness: number; // 0-100 score
  responsiveness: number; // 0-100 score
  sustainabilityRating: number; // 0-100 score
  riskScore: number; // 0-100 score (higher = more risky)
  relationshipDuration: number; // months
  totalTransactionValue: number; // USD
  lastAuditDate: Date;
  certifications: string[];
}

/**
 * Supply chain node interface (suppliers, manufacturers, distributors, etc.)
 */
export interface SupplyChainNode {
  id: string;
  name: string;
  type: 'supplier' | 'manufacturer' | 'distributor' | 'retailer' | 'warehouse' | 'logistics';
  tier: number; // 1 = direct supplier, 2 = supplier's supplier, etc.
  location: GeographicLocation;
  capacity: ProductionCapacity;
  performance: SupplierPerformanceMetrics;
  risks: RiskAssessment[];
  sustainability: SustainabilityMetrics;
  contactInfo: ContactInformation;
  financialHealth: FinancialHealthMetrics;
  complianceStatus: ComplianceStatus;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Production capacity interface
 */
export interface ProductionCapacity {
  maxDailyOutput: number;
  currentUtilization: number; // 0-100 percentage
  peakCapacityPeriods: string[]; // time periods when at peak
  seasonalVariations: SeasonalCapacity[];
  capacityConstraints: string[];
  expansionPlans: CapacityExpansionPlan[];
}

/**
 * Seasonal capacity variations
 */
export interface SeasonalCapacity {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  capacityMultiplier: number; // 1.0 = normal, 1.2 = 20% increase, 0.8 = 20% decrease
  demandPattern: 'high' | 'medium' | 'low';
}

/**
 * Capacity expansion plans
 */
export interface CapacityExpansionPlan {
  plannedDate: Date;
  additionalCapacity: number;
  investmentRequired: number; // USD
  timeToImplement: number; // months
  riskFactors: string[];
}

/**
 * Risk assessment interface
 */
export interface RiskAssessment {
  id: string;
  type: 'operational' | 'financial' | 'geopolitical' | 'environmental' | 'cyber' | 'regulatory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-100 percentage
  impact: number; // 0-100 score
  description: string;
  mitigationStrategies: MitigationStrategy[];
  lastAssessedDate: Date;
  assessedBy: string;
  status: 'active' | 'mitigated' | 'monitoring' | 'resolved';
}

/**
 * Risk mitigation strategies
 */
export interface MitigationStrategy {
  id: string;
  description: string;
  implementation: 'planned' | 'in-progress' | 'completed';
  cost: number; // USD
  effectiveness: number; // 0-100 score
  timeframe: number; // days to implement
  responsible: string;
}

/**
 * Sustainability metrics interface
 */
export interface SustainabilityMetrics {
  carbonFootprint: CarbonFootprint;
  waterUsage: WaterUsage;
  wasteManagement: WasteManagement;
  energyConsumption: EnergyConsumption;
  socialResponsibility: SocialResponsibilityMetrics;
  certifications: SustainabilityCertification[];
  esgScore: number; // 0-100 Environmental, Social, Governance score
}

/**
 * Carbon footprint tracking
 */
export interface CarbonFootprint {
  scope1Emissions: number; // tCO2e - direct emissions
  scope2Emissions: number; // tCO2e - indirect emissions from energy
  scope3Emissions: number; // tCO2e - value chain emissions
  totalEmissions: number; // tCO2e
  emissionsPerUnit: number; // tCO2e per product unit
  carbonNeutralTarget: Date | null;
  offsetPrograms: CarbonOffsetProgram[];
}

/**
 * Carbon offset programs
 */
export interface CarbonOffsetProgram {
  id: string;
  name: string;
  type: 'forestry' | 'renewable-energy' | 'technology' | 'community';
  offsetAmount: number; // tCO2e
  cost: number; // USD
  verificationStandard: string;
  projectLocation: string;
}

/**
 * Water usage metrics
 */
export interface WaterUsage {
  totalConsumption: number; // liters per month
  recyclingRate: number; // 0-100 percentage
  sourceTypes: string[]; // municipal, well, recycled, etc.
  qualityMetrics: WaterQualityMetric[];
  conservationInitiatives: string[];
}

/**
 * Water quality metrics
 */
export interface WaterQualityMetric {
  parameter: string; // pH, turbidity, contaminants, etc.
  value: number;
  unit: string;
  standard: string;
  compliance: boolean;
}

/**
 * Waste management metrics
 */
export interface WasteManagement {
  totalWasteGenerated: number; // kg per month
  recyclingRate: number; // 0-100 percentage
  wasteTypes: WasteTypeBreakdown[];
  disposalMethods: DisposalMethod[];
  wasteReductionTargets: WasteReductionTarget[];
}

/**
 * Waste type breakdown
 */
export interface WasteTypeBreakdown {
  type: string; // plastic, metal, organic, electronic, etc.
  amount: number; // kg
  recyclingRate: number; // 0-100 percentage
  disposalCost: number; // USD
}

/**
 * Disposal methods
 */
export interface DisposalMethod {
  method: 'recycling' | 'composting' | 'incineration' | 'landfill' | 'donation' | 'reuse';
  percentage: number; // 0-100 percentage of total waste
  cost: number; // USD
  environmentalImpact: number; // 0-100 score
}

/**
 * Waste reduction targets
 */
export interface WasteReductionTarget {
  targetDate: Date;
  reductionPercentage: number; // 0-100 percentage reduction from baseline
  currentProgress: number; // 0-100 percentage toward target
  initiatives: string[];
}

/**
 * Energy consumption metrics
 */
export interface EnergyConsumption {
  totalConsumption: number; // kWh per month
  renewablePercentage: number; // 0-100 percentage from renewable sources
  energySources: EnergySource[];
  efficiencyMetrics: EnergyEfficiencyMetric[];
  conservationMeasures: string[];
}

/**
 * Energy sources
 */
export interface EnergySource {
  type: 'solar' | 'wind' | 'hydro' | 'nuclear' | 'natural-gas' | 'coal' | 'biomass' | 'grid';
  percentage: number; // 0-100 percentage of total energy
  cost: number; // USD per kWh
  carbonIntensity: number; // gCO2e per kWh
}

/**
 * Energy efficiency metrics
 */
export interface EnergyEfficiencyMetric {
  metric: string; // energy per unit produced, etc.
  value: number;
  unit: string;
  benchmark: number; // industry benchmark value
  improvement: number; // percentage improvement year-over-year
}

/**
 * Social responsibility metrics
 */
export interface SocialResponsibilityMetrics {
  employeeWellbeing: EmployeeWellbeingMetrics;
  communityImpact: CommunityImpactMetrics;
  diversityInclusion: DiversityInclusionMetrics;
  laborPractices: LaborPracticeMetrics;
  humanRights: HumanRightsMetrics;
}

/**
 * Employee wellbeing metrics
 */
export interface EmployeeWellbeingMetrics {
  totalEmployees: number;
  turnoverRate: number; // 0-100 percentage
  satisfactionScore: number; // 0-100 score
  safetyIncidentRate: number; // incidents per 100 employees
  trainingHoursPerEmployee: number;
  benefitsScore: number; // 0-100 score
}

/**
 * Community impact metrics
 */
export interface CommunityImpactMetrics {
  localEmploymentPercentage: number; // 0-100 percentage
  communityInvestment: number; // USD annually
  localSupplierPercentage: number; // 0-100 percentage
  volunteerHours: number; // annual employee volunteer hours
  communityProjects: CommunityProject[];
}

/**
 * Community projects
 */
export interface CommunityProject {
  name: string;
  description: string;
  investment: number; // USD
  beneficiaries: number; // people impacted
  duration: number; // months
  outcomes: string[];
}

/**
 * Diversity and inclusion metrics
 */
export interface DiversityInclusionMetrics {
  genderDiversity: number; // 0-100 percentage
  ethnicDiversity: number; // 0-100 percentage
  ageDistribution: AgeDistribution[];
  leadershipDiversity: number; // 0-100 percentage in leadership roles
  payEquityScore: number; // 0-100 score
  inclusionScore: number; // 0-100 score from employee surveys
}

/**
 * Age distribution breakdown
 */
export interface AgeDistribution {
  ageRange: string; // "18-25", "26-35", etc.
  percentage: number; // 0-100 percentage of workforce
}

/**
 * Labor practice metrics
 */
export interface LaborPracticeMetrics {
  fairWageCompliance: boolean;
  workingHoursCompliance: boolean;
  childLaborPolicy: boolean;
  forcedLaborPolicy: boolean;
  unionizationRate: number; // 0-100 percentage
  grievanceProcedures: boolean;
  auditResults: LaborAuditResult[];
}

/**
 * Labor audit results
 */
export interface LaborAuditResult {
  auditDate: Date;
  auditor: string;
  score: number; // 0-100 score
  violations: string[];
  correctiveActions: string[];
  followUpDate: Date;
}

/**
 * Human rights metrics
 */
export interface HumanRightsMetrics {
  humanRightsPolicy: boolean;
  riskAssessment: boolean;
  grievanceMechanism: boolean;
  training: boolean;
  monitoring: boolean;
  reporting: boolean;
  violations: HumanRightsViolation[];
}

/**
 * Human rights violations tracking
 */
export interface HumanRightsViolation {
  id: string;
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  reportedDate: Date;
  status: 'reported' | 'investigating' | 'resolved' | 'dismissed';
  remedialActions: string[];
}

/**
 * Sustainability certifications
 */
export interface SustainabilityCertification {
  name: string;
  issuingBody: string;
  certificationDate: Date;
  expirationDate: Date;
  scope: string;
  score: number | null; // if applicable
  documentUrl: string;
}

/**
 * Contact information
 */
export interface ContactInformation {
  primaryContact: Contact;
  emergencyContact: Contact;
  technicalContact: Contact;
  financialContact: Contact;
}

/**
 * Individual contact details
 */
export interface Contact {
  name: string;
  title: string;
  email: string;
  phone: string;
  mobile: string;
  languages: string[];
  preferredCommunication: 'email' | 'phone' | 'mobile' | 'teams' | 'slack';
}

/**
 * Financial health metrics
 */
export interface FinancialHealthMetrics {
  creditRating: string;
  debtToEquityRatio: number;
  currentRatio: number;
  quickRatio: number;
  profitMargin: number; // 0-100 percentage
  revenue: number; // USD annual
  ebitda: number; // USD
  cashFlow: number; // USD
  paymentTermsCompliance: number; // 0-100 percentage
  bankruptcyRisk: number; // 0-100 score
  lastFinancialAudit: Date;
}

/**
 * Compliance status
 */
export interface ComplianceStatus {
  overallStatus: 'compliant' | 'minor-issues' | 'major-issues' | 'non-compliant';
  lastAuditDate: Date;
  nextAuditDate: Date;
  complianceAreas: ComplianceArea[];
  violations: ComplianceViolation[];
  certifications: Certification[];
}

/**
 * Compliance areas
 */
export interface ComplianceArea {
  area: string; // ISO 9001, ISO 14001, GDPR, SOX, etc.
  status: 'compliant' | 'non-compliant' | 'in-progress' | 'not-applicable';
  lastReviewDate: Date;
  nextReviewDate: Date;
  responsible: string;
  evidence: string[];
}

/**
 * Compliance violations
 */
export interface ComplianceViolation {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  discoveredDate: Date;
  status: 'open' | 'in-progress' | 'resolved' | 'accepted-risk';
  remediation: string;
  dueDate: Date;
  responsible: string;
}

/**
 * General certifications
 */
export interface Certification {
  name: string;
  issuingBody: string;
  certificationNumber: string;
  issueDate: Date;
  expirationDate: Date;
  scope: string;
  status: 'active' | 'expired' | 'suspended' | 'revoked';
}

/**
 * Product interface for supply chain tracking
 */
export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  subcategory: string;
  unitOfMeasure: string;
  dimensions: ProductDimensions;
  weight: number; // kg
  value: number; // USD per unit
  shelfLife: number | null; // days, null for non-perishable
  storageRequirements: StorageRequirement[];
  handlingInstructions: string[];
  hazardousClassification: string | null;
  regulatoryRequirements: string[];
  billOfMaterials: BillOfMaterial[];
  qualityStandards: QualityStandard[];
  packaging: PackagingSpecification;
}

/**
 * Product dimensions
 */
export interface ProductDimensions {
  length: number; // cm
  width: number; // cm
  height: number; // cm
  volume: number; // cm³
}

/**
 * Storage requirements
 */
export interface StorageRequirement {
  type: 'temperature' | 'humidity' | 'light' | 'pressure' | 'atmosphere';
  minValue: number | null;
  maxValue: number | null;
  unit: string;
  critical: boolean;
}

/**
 * Bill of materials
 */
export interface BillOfMaterial {
  componentId: string;
  componentName: string;
  quantity: number;
  unit: string;
  cost: number; // USD
  supplierId: string;
  leadTime: number; // days
  alternatives: AlternativeComponent[];
}

/**
 * Alternative components
 */
export interface AlternativeComponent {
  componentId: string;
  componentName: string;
  supplierId: string;
  cost: number; // USD
  qualityDelta: number; // -100 to +100 percentage difference
  availability: 'high' | 'medium' | 'low';
}

/**
 * Quality standards
 */
export interface QualityStandard {
  standard: string;
  requirement: string;
  testMethod: string;
  acceptanceCriteria: string;
  frequency: string;
  responsible: string;
}

/**
 * Packaging specifications
 */
export interface PackagingSpecification {
  primaryPackaging: PackagingLevel;
  secondaryPackaging: PackagingLevel;
  tertiaryPackaging: PackagingLevel;
  sustainability: PackagingSustainability;
}

/**
 * Packaging level details
 */
export interface PackagingLevel {
  material: string;
  dimensions: ProductDimensions;
  weight: number; // kg
  cost: number; // USD
  recyclable: boolean;
  biodegradable: boolean;
  reusable: boolean;
}

/**
 * Packaging sustainability metrics
 */
export interface PackagingSustainability {
  recyclablePercentage: number; // 0-100 percentage
  renewableContentPercentage: number; // 0-100 percentage
  carbonFootprint: number; // gCO2e per package
  endOfLifeOptions: string[];
}

/**
 * Inventory item interface
 */
export interface InventoryItem {
  id: string;
  productId: string;
  locationId: string;
  quantityOnHand: number;
  quantityAvailable: number; // on hand minus reserved
  quantityReserved: number;
  quantityOnOrder: number;
  reorderPoint: number;
  safetyStock: number;
  maximumStock: number;
  averageCost: number; // USD per unit
  lastMovementDate: Date;
  turnoverRate: number; // times per year
  daysOnHand: number;
  abcClassification: 'A' | 'B' | 'C'; // ABC analysis classification
  obsolescenceRisk: number; // 0-100 score
  demandPattern: DemandPattern;
  lotTracking: LotTrackingInfo[];
}

/**
 * Demand pattern analysis
 */
export interface DemandPattern {
  type: 'steady' | 'seasonal' | 'trending' | 'intermittent' | 'lumpy';
  seasonality: SeasonalPattern | null;
  trend: TrendPattern | null;
  volatility: number; // 0-100 score
  forecastAccuracy: number; // 0-100 percentage
}

/**
 * Seasonal pattern
 */
export interface SeasonalPattern {
  peakMonths: number[]; // 1-12
  lowMonths: number[]; // 1-12
  seasonalIndex: MonthlyIndex[];
}

/**
 * Monthly seasonal index
 */
export interface MonthlyIndex {
  month: number; // 1-12
  index: number; // 1.0 = average, 1.2 = 20% above average
}

/**
 * Trend pattern
 */
export interface TrendPattern {
  direction: 'increasing' | 'decreasing' | 'stable';
  slope: number; // percentage change per period
  confidence: number; // 0-100 percentage
  changePoints: Date[]; // dates when trend changed
}

/**
 * Lot tracking information
 */
export interface LotTrackingInfo {
  lotNumber: string;
  quantity: number;
  receivedDate: Date;
  expirationDate: Date | null;
  supplierId: string;
  qualityStatus: 'approved' | 'quarantine' | 'rejected' | 'testing';
  testResults: QualityTestResult[];
}

/**
 * Quality test results
 */
export interface QualityTestResult {
  testId: string;
  testName: string;
  result: string;
  unit: string;
  specification: string;
  passed: boolean;
  testDate: Date;
  technician: string;
}

/**
 * Demand forecast interface
 */
export interface DemandForecast {
  productId: string;
  locationId: string;
  forecastPeriod: ForecastPeriod;
  method: ForecastMethod;
  forecast: ForecastDataPoint[];
  accuracy: ForecastAccuracy;
  assumptions: string[];
  generatedDate: Date;
  generatedBy: string;
  confidence: number; // 0-100 percentage
}

/**
 * Forecast period
 */
export interface ForecastPeriod {
  startDate: Date;
  endDate: Date;
  granularity: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  horizon: number; // number of periods ahead
}

/**
 * Forecast method
 */
export interface ForecastMethod {
  name: string;
  type: 'statistical' | 'machine-learning' | 'expert-judgment' | 'hybrid';
  parameters: Record<string, any>;
  version: string;
  trainingData: TrainingDataInfo;
}

/**
 * Training data information
 */
export interface TrainingDataInfo {
  startDate: Date;
  endDate: Date;
  recordCount: number;
  features: string[];
  dataQuality: number; // 0-100 score
}

/**
 * Forecast data point
 */
export interface ForecastDataPoint {
  date: Date;
  forecast: number;
  lowerBound: number;
  upperBound: number;
  confidence: number; // 0-100 percentage
  factors: ForecastFactor[];
}

/**
 * Forecast factors
 */
export interface ForecastFactor {
  factor: string;
  impact: number; // -100 to +100 percentage impact
  confidence: number; // 0-100 percentage
}

/**
 * Forecast accuracy metrics
 */
export interface ForecastAccuracy {
  mae: number; // Mean Absolute Error
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  bias: number; // Forecast bias
  trackingSignal: number;
  lastUpdated: Date;
  historicalPerformance: AccuracyHistory[];
}

/**
 * Historical accuracy tracking
 */
export interface AccuracyHistory {
  period: Date;
  mae: number;
  mape: number;
  rmse: number;
  bias: number;
}

/**
 * Supply chain event interface for real-time tracking
 */
export interface SupplyChainEvent {
  id: string;
  type: SupplyChainEventType;
  timestamp: Date;
  source: EventSource;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  description: string;
  affected: AffectedEntity[];
  impact: EventImpact;
  resolution: EventResolution | null;
  metadata: Record<string, any>;
  correlationId: string;
  tags: string[];
}

/**
 * Supply chain event types
 */
export type SupplyChainEventType =
  | 'shipment-delayed'
  | 'shipment-arrived'
  | 'shipment-departed'
  | 'quality-issue'
  | 'supplier-disruption'
  | 'demand-spike'
  | 'demand-drop'
  | 'inventory-low'
  | 'inventory-excess'
  | 'cost-change'
  | 'weather-disruption'
  | 'geopolitical-risk'
  | 'cyber-incident'
  | 'compliance-violation'
  | 'system-error'
  | 'maintenance-scheduled'
  | 'capacity-change'
  | 'contract-renewal'
  | 'audit-finding';

/**
 * Event source information
 */
export interface EventSource {
  system: string;
  component: string;
  version: string;
  location: string;
  userId: string | null;
}

/**
 * Affected entities
 */
export interface AffectedEntity {
  type: 'supplier' | 'product' | 'location' | 'shipment' | 'order' | 'customer';
  id: string;
  name: string;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Event impact assessment
 */
export interface EventImpact {
  operational: OperationalImpact;
  financial: FinancialImpact;
  customer: CustomerImpact;
  reputation: ReputationImpact;
  regulatory: RegulatoryImpact;
}

/**
 * Operational impact
 */
export interface OperationalImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedProcesses: string[];
  downtime: number | null; // minutes
  capacityImpact: number; // percentage reduction
  alternativesAvailable: boolean;
}

/**
 * Financial impact
 */
export interface FinancialImpact {
  estimatedCost: number; // USD
  revenueImpact: number; // USD
  costCategory: 'operational' | 'penalty' | 'opportunity' | 'recovery';
  insured: boolean;
  recoverable: boolean;
}

/**
 * Customer impact
 */
export interface CustomerImpact {
  affectedCustomers: number;
  deliveryDelay: number | null; // days
  qualityImpact: boolean;
  communicationRequired: boolean;
  compensationRequired: boolean;
}

/**
 * Reputation impact
 */
export interface ReputationImpact {
  severity: 'low' | 'medium' | 'high' | 'critical';
  mediaExposure: boolean;
  brandDamage: boolean;
  stakeholderConcern: boolean;
  recoveryTime: number | null; // days
}

/**
 * Regulatory impact
 */
export interface RegulatoryImpact {
  violations: string[];
  reportingRequired: boolean;
  finesRisk: boolean;
  licenseRisk: boolean;
  auditTriggered: boolean;
}

/**
 * Event resolution
 */
export interface EventResolution {
  status: 'resolved' | 'in-progress' | 'escalated' | 'monitoring';
  resolution: string;
  resolvedBy: string;
  resolvedDate: Date;
  timeToResolve: number; // minutes
  rootCause: string;
  preventiveActions: string[];
  lessonsLearned: string[];
}

/**
 * Optimization recommendation interface
 */
export interface OptimizationRecommendation {
  id: string;
  type: OptimizationRecommendationType;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  rationale: string;
  impact: OptimizationImpact;
  implementation: ImplementationPlan;
  risks: OptimizationRisk[];
  dependencies: string[];
  alternatives: AlternativeRecommendation[];
  confidence: number; // 0-100 percentage
  validUntil: Date;
  generatedDate: Date;
  generatedBy: string;
  status: 'pending' | 'approved' | 'in-progress' | 'completed' | 'rejected';
}

/**
 * Optimization recommendation types
 */
export type OptimizationRecommendationType =
  | 'inventory-reduction'
  | 'inventory-increase'
  | 'supplier-diversification'
  | 'supplier-consolidation'
  | 'route-optimization'
  | 'warehouse-relocation'
  | 'capacity-expansion'
  | 'capacity-reduction'
  | 'cost-reduction'
  | 'lead-time-improvement'
  | 'quality-improvement'
  | 'sustainability-improvement'
  | 'risk-mitigation'
  | 'technology-upgrade'
  | 'process-automation';

/**
 * Optimization impact
 */
export interface OptimizationImpact {
  costSavings: number; // USD annually
  revenueIncrease: number; // USD annually
  efficiencyGain: number; // percentage improvement
  qualityImprovement: number; // percentage improvement
  riskReduction: number; // percentage reduction
  sustainabilityImprovement: number; // percentage improvement
  timeframe: number; // months to realize benefits
  roi: number; // percentage return on investment
}

/**
 * Implementation plan
 */
export interface ImplementationPlan {
  phases: ImplementationPhase[];
  totalDuration: number; // months
  totalCost: number; // USD
  requiredResources: RequiredResource[];
  milestones: Milestone[];
  successCriteria: string[];
}

/**
 * Implementation phases
 */
export interface ImplementationPhase {
  phase: number;
  name: string;
  description: string;
  duration: number; // months
  cost: number; // USD
  deliverables: string[];
  dependencies: string[];
  risks: string[];
}

/**
 * Required resources
 */
export interface RequiredResource {
  type: 'human' | 'technology' | 'infrastructure' | 'training' | 'consulting';
  description: string;
  quantity: number;
  unit: string;
  cost: number; // USD
  availability: 'available' | 'need-to-acquire' | 'uncertain';
}

/**
 * Implementation milestones
 */
export interface Milestone {
  name: string;
  description: string;
  targetDate: Date;
  criteria: string[];
  responsible: string;
  dependencies: string[];
}

/**
 * Optimization risks
 */
export interface OptimizationRisk {
  risk: string;
  probability: number; // 0-100 percentage
  impact: number; // 0-100 score
  mitigation: string;
  contingency: string;
}

/**
 * Alternative recommendations
 */
export interface AlternativeRecommendation {
  title: string;
  description: string;
  pros: string[];
  cons: string[];
  cost: number; // USD
  timeframe: number; // months
  confidence: number; // 0-100 percentage
}

/**
 * Performance KPI interface
 */
export interface PerformanceKPI {
  id: string;
  name: string;
  category: KPICategory;
  description: string;
  unit: string;
  value: number;
  target: number;
  threshold: KPIThreshold;
  trend: KPITrend;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annually';
  owner: string;
  lastUpdated: Date;
  dataSource: string;
  calculationMethod: string;
  historicalData: KPIDataPoint[];
}

/**
 * KPI categories
 */
export type KPICategory =
  | 'cost'
  | 'quality'
  | 'delivery'
  | 'flexibility'
  | 'innovation'
  | 'sustainability'
  | 'risk'
  | 'customer-satisfaction'
  | 'supplier-performance'
  | 'inventory'
  | 'capacity-utilization';

/**
 * KPI thresholds
 */
export interface KPIThreshold {
  excellent: number;
  good: number;
  acceptable: number;
  poor: number;
  critical: number;
}

/**
 * KPI trend analysis
 */
export interface KPITrend {
  direction: 'improving' | 'stable' | 'declining';
  slope: number; // rate of change
  confidence: number; // 0-100 percentage
  changePoints: Date[]; // significant trend changes
  seasonality: boolean;
}

/**
 * KPI historical data
 */
export interface KPIDataPoint {
  date: Date;
  value: number;
  target: number;
  variance: number; // actual - target
  variancePercentage: number; // (actual - target) / target * 100
  notes: string | null;
}

/**
 * Scenario analysis interface
 */
export interface ScenarioAnalysis {
  id: string;
  name: string;
  description: string;
  type: 'what-if' | 'stress-test' | 'monte-carlo' | 'sensitivity';
  parameters: ScenarioParameter[];
  results: ScenarioResult[];
  recommendations: string[];
  confidence: number; // 0-100 percentage
  createdDate: Date;
  createdBy: string;
  lastRunDate: Date;
  status: 'draft' | 'running' | 'completed' | 'failed';
}

/**
 * Scenario parameters
 */
export interface ScenarioParameter {
  name: string;
  type: 'numeric' | 'categorical' | 'boolean' | 'date';
  baselineValue: any;
  testValues: any[];
  description: string;
  impact: 'low' | 'medium' | 'high';
}

/**
 * Scenario results
 */
export interface ScenarioResult {
  scenarioName: string;
  parameters: Record<string, any>;
  outcomes: ScenarioOutcome[];
  probability: number; // 0-100 percentage (for probabilistic scenarios)
  ranking: number; // best to worst outcome ranking
}

/**
 * Scenario outcomes
 */
export interface ScenarioOutcome {
  metric: string;
  value: number;
  unit: string;
  changeFromBaseline: number; // percentage change
  impact: 'positive' | 'negative' | 'neutral';
  significance: 'low' | 'medium' | 'high';
}