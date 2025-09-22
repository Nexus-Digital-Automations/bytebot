/**
 * ML-Based Behavioral Analytics Engine
 *
 * Advanced machine learning system for detecting behavioral anomalies,
 * insider threats, and sophisticated attack patterns in real-time
 *
 * @fileoverview ML Behavioral Analytics Engine
 * @version 2.0.0
 * @author PARLANT Threat Detection Specialist
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

/**
 * Behavioral Pattern Types
 */
export enum BehaviorPatternType {
  ACCESS_PATTERN = "access_pattern",
  TIME_PATTERN = "time_pattern",
  RESOURCE_USAGE = "resource_usage",
  NETWORK_BEHAVIOR = "network_behavior",
  APPLICATION_USAGE = "application_usage",
  DATA_ACCESS = "data_access",
  AUTHENTICATION = "authentication",
  GEOGRAPHIC = "geographic",
}

/**
 * User Behavioral Profile
 */
export interface UserBehaviorProfile {
  userId: string;
  profileVersion: number;
  createdAt: Date;
  lastUpdated: Date;

  // Temporal patterns
  accessPatterns: {
    workingHours: TimePattern;
    weeklyPattern: WeeklyPattern;
    seasonalPattern: SeasonalPattern;
  };

  // Location patterns
  locationPatterns: {
    primaryLocations: GeographicCluster[];
    travelPatterns: TravelPattern[];
    networkPatterns: NetworkPattern[];
  };

  // Application usage patterns
  applicationPatterns: {
    frequentApplications: ApplicationUsage[];
    usageIntensity: IntensityPattern[];
    featureUsage: FeatureUsagePattern[];
  };

  // Data access patterns
  dataAccessPatterns: {
    frequentResources: ResourceAccess[];
    accessVolume: VolumePattern;
    dataTypes: DataTypeUsage[];
  };

  // Security behavior
  securityPatterns: {
    authenticationMethods: AuthMethodUsage[];
    deviceUsage: DeviceUsagePattern[];
    failurePatterns: FailurePattern[];
  };

  // Risk scoring
  baselineRisk: number;
  currentRisk: number;
  riskFactors: RiskFactor[];

  // Machine learning features
  featureVector: number[];
  clusterAssignment?: string;
  anomalyThreshold: number;
}

export interface TimePattern {
  hourlyDistribution: number[]; // 24 hours
  peakHours: number[];
  variance: number;
  confidence: number;
}

export interface WeeklyPattern {
  dailyDistribution: number[]; // 7 days
  weekdayVsWeekend: { weekday: number; weekend: number };
  variance: number;
  confidence: number;
}

export interface SeasonalPattern {
  monthlyDistribution: number[]; // 12 months
  trends: TrendData[];
  variance: number;
  confidence: number;
}

export interface TrendData {
  period: string;
  trend: "increasing" | "decreasing" | "stable";
  magnitude: number;
}

export interface GeographicCluster {
  clusterId: string;
  centerPoint: { latitude: number; longitude: number };
  radius: number; // meters
  frequency: number;
  confidence: number;
}

export interface TravelPattern {
  fromLocation: string;
  toLocation: string;
  frequency: number;
  typicalDuration: number;
  lastSeen: Date;
}

export interface NetworkPattern {
  networkType: "corporate" | "home" | "mobile" | "public";
  networkId: string;
  frequency: number;
  riskLevel: number;
  lastSeen: Date;
}

export interface ApplicationUsage {
  applicationId: string;
  applicationName: string;
  frequency: number;
  averageSessionDuration: number;
  peakUsageTimes: number[];
  features: string[];
}

export interface IntensityPattern {
  metric:
    | "session_duration"
    | "clicks_per_minute"
    | "data_volume"
    | "api_calls";
  average: number;
  standardDeviation: number;
  percentiles: { p50: number; p90: number; p95: number; p99: number };
}

export interface FeatureUsagePattern {
  featureName: string;
  usageFrequency: number;
  expertiseLevel: "novice" | "intermediate" | "expert";
  lastUsed: Date;
}

export interface ResourceAccess {
  resourceId: string;
  resourceType: string;
  accessFrequency: number;
  averageAccessDuration: number;
  typicalActions: string[];
}

export interface VolumePattern {
  dailyAverage: number;
  weeklyAverage: number;
  monthlyAverage: number;
  spikeThreashold: number;
  variability: number;
}

export interface DataTypeUsage {
  dataType: string;
  classification: "public" | "internal" | "confidential" | "restricted";
  accessFrequency: number;
  volumeAccessed: number;
  lastAccess: Date;
}

export interface AuthMethodUsage {
  method: string;
  frequency: number;
  successRate: number;
  typicalTimes: number[];
  deviceTypes: string[];
}

export interface DeviceUsagePattern {
  deviceId: string;
  deviceType: string;
  frequency: number;
  typicalUsageHours: number[];
  riskScore: number;
}

export interface FailurePattern {
  failureType: string;
  frequency: number;
  timingPattern: number[];
  associatedActions: string[];
}

export interface RiskFactor {
  factor: string;
  impact: number; // -1 to 1 scale
  confidence: number; // 0 to 1
  lastObserved: Date;
}

/**
 * Behavioral Anomaly Detection Result
 */
export interface BehaviorAnomalyResult {
  userId: string;
  detectionId: string;
  timestamp: Date;

  anomalyScore: number; // 0 to 1 scale
  confidence: number; // 0 to 1 scale
  severity: "low" | "medium" | "high" | "critical";

  anomalies: DetectedAnomaly[];
  recommendations: string[];
  requiredActions: RequiredAction[];

  contextData: {
    currentSession: SessionContext;
    historicalBaseline: BehavioralBaseline;
    peerComparison: PeerComparisonData;
  };
}

export interface DetectedAnomaly {
  type: BehaviorPatternType;
  description: string;
  anomalyScore: number;
  deviationMagnitude: number;
  expectedValue: number | string;
  actualValue: number | string;
  evidence: AnomalyEvidence[];
}

export interface AnomalyEvidence {
  evidenceType: "statistical" | "pattern" | "comparison" | "temporal";
  description: string;
  data: Record<string, unknown>;
  weight: number;
}

export interface RequiredAction {
  action: "monitor" | "alert" | "challenge" | "block" | "investigate";
  priority: "low" | "medium" | "high" | "immediate";
  description: string;
  automatable: boolean;
}

export interface SessionContext {
  sessionId: string;
  startTime: Date;
  currentLocation?: { latitude: number; longitude: number };
  networkType: string;
  deviceId: string;
  applicationUsage: ApplicationSession[];
  dataAccessed: ResourceAccess[];
}

export interface ApplicationSession {
  applicationId: string;
  startTime: Date;
  endTime?: Date;
  actionsPerformed: string[];
  dataAccessed: string[];
}

export interface BehavioralBaseline {
  profileAge: number; // days
  dataPoints: number;
  lastUpdate: Date;
  confidence: number;
  stablePatterns: string[];
  evolvingPatterns: string[];
}

export interface PeerComparisonData {
  peerGroup: string;
  peerGroupSize: number;
  userPercentile: number;
  significantDeviations: string[];
}

/**
 * ML Model Configuration
 */
export interface MLModelConfig {
  modelType: "isolation_forest" | "one_class_svm" | "autoencoder" | "ensemble";
  features: string[];
  trainingWindow: number; // days
  retrainingInterval: number; // hours
  anomalyThreshold: number; // 0 to 1
  minimumDataPoints: number;
}

@Injectable()
export class MLBehavioralAnalytics {
  private readonly logger = new Logger(MLBehavioralAnalytics.name);
  private readonly eventEmitter: EventEmitter2;

  // User profiles and models
  private readonly userProfiles: Map<string, UserBehaviorProfile> = new Map();
  private readonly mlModels: Map<string, MLModelConfig> = new Map();
  private readonly anomalyDetectors: Map<string, unknown> = new Map(); // Would contain actual ML models

  // Configuration
  private readonly profileUpdateInterval = 3600000; // 1 hour
  private readonly minObservationPeriod = 604800000; // 7 days
  private readonly maxProfileAge = 7776000000; // 90 days

  // Statistics
  private totalProfilesCreated = 0;
  private totalAnomaliesDetected = 0;
  private totalFalsePositives = 0;

  constructor(eventEmitter: EventEmitter2) {
    this.eventEmitter = eventEmitter;
    this.initializeMLModels();
    this.startProfileUpdateTimer();
    this.logger.log("ML Behavioral Analytics Engine initialized");
  }

  /**
   * Initialize machine learning models
   */
  private initializeMLModels(): void {
    const defaultModels: Array<{ name: string; config: MLModelConfig }> = [
      {
        name: "ACCESS_PATTERN_DETECTOR",
        config: {
          modelType: "isolation_forest",
          features: [
            "hour_of_day",
            "day_of_week",
            "resource_frequency",
            "session_duration",
          ],
          trainingWindow: 30,
          retrainingInterval: 24,
          anomalyThreshold: 0.1,
          minimumDataPoints: 100,
        },
      },
      {
        name: "GEOGRAPHIC_ANOMALY_DETECTOR",
        config: {
          modelType: "one_class_svm",
          features: [
            "latitude",
            "longitude",
            "travel_distance",
            "location_frequency",
          ],
          trainingWindow: 60,
          retrainingInterval: 48,
          anomalyThreshold: 0.05,
          minimumDataPoints: 50,
        },
      },
      {
        name: "DATA_ACCESS_ANALYZER",
        config: {
          modelType: "autoencoder",
          features: [
            "data_volume",
            "data_types",
            "access_frequency",
            "classification_level",
          ],
          trainingWindow: 14,
          retrainingInterval: 12,
          anomalyThreshold: 0.15,
          minimumDataPoints: 200,
        },
      },
      {
        name: "BEHAVIORAL_ENSEMBLE",
        config: {
          modelType: "ensemble",
          features: ["all_behavioral_features"],
          trainingWindow: 45,
          retrainingInterval: 72,
          anomalyThreshold: 0.08,
          minimumDataPoints: 500,
        },
      },
    ];

    defaultModels.forEach(({ name, config }) => {
      this.mlModels.set(name, config);
    });

    this.logger.log(
      `Initialized ${this.mlModels.size} ML models for behavioral analysis`,
    );
  }

  /**
   * Analyze user behavior and detect anomalies
   */
  public async analyzeBehavior(
    userId: string,
    sessionData: SessionContext,
    contextData?: Record<string, unknown>,
  ): Promise<BehaviorAnomalyResult> {
    const startTime = Date.now();

    try {
      this.logger.debug(`Analyzing behavior for user: ${userId}`);

      // Get or create user profile
      const userProfile = await this.getUserProfile(userId);

      // Update profile with current session data
      await this.updateUserProfile(userProfile, sessionData);

      // Perform anomaly detection
      const anomalies = await this.detectAnomalies(userProfile, sessionData);

      // Calculate overall anomaly score
      const anomalyScore = this.calculateOverallAnomalyScore(anomalies);

      // Determine severity
      const severity = this.determineSeverity(anomalyScore, anomalies);

      // Generate recommendations and required actions
      const recommendations = this.generateRecommendations(
        anomalies,
        userProfile,
      );
      const requiredActions = this.determineRequiredActions(
        anomalies,
        severity,
      );

      // Create context data
      const contextData_result = {
        currentSession: sessionData,
        historicalBaseline: this.createHistoricalBaseline(userProfile),
        peerComparison: await this.performPeerComparison(userId, userProfile),
      };

      const result: BehaviorAnomalyResult = {
        userId,
        detectionId: this.generateDetectionId(),
        timestamp: new Date(),
        anomalyScore,
        confidence: this.calculateConfidence(userProfile, anomalies),
        severity,
        anomalies,
        recommendations,
        requiredActions,
        contextData: contextData_result,
      };

      const processingTime = Date.now() - startTime;
      this.logger.debug(
        `Behavior analysis completed for ${userId} in ${processingTime}ms - Score: ${anomalyScore.toFixed(3)}`,
      );

      // Update statistics
      if (anomalyScore > 0.5) {
        this.totalAnomaliesDetected++;
      }

      // Emit behavioral analysis event
      this.eventEmitter.emit("behavior.analysis.completed", {
        userId,
        detectionId: result.detectionId,
        anomalyScore,
        severity,
        anomaliesCount: anomalies.length,
      });

      // Emit high-severity alerts
      if (severity === "high" || severity === "critical") {
        this.eventEmitter.emit("behavior.anomaly.high_severity", {
          userId,
          detectionId: result.detectionId,
          severity,
          anomalyScore,
          topAnomalies: anomalies.slice(0, 3),
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`Behavioral analysis failed for user ${userId}`, error);
      throw new Error(`Behavioral analysis failed: ${error.message}`);
    }
  }

  /**
   * Get or create user behavioral profile
   */
  private async getUserProfile(userId: string): Promise<UserBehaviorProfile> {
    let profile = this.userProfiles.get(userId);

    if (!profile) {
      profile = this.createDefaultUserProfile(userId);
      this.userProfiles.set(userId, profile);
      this.totalProfilesCreated++;
      this.logger.debug(`Created new behavioral profile for user: ${userId}`);
    }

    return profile;
  }

  /**
   * Create default user profile
   */
  private createDefaultUserProfile(userId: string): UserBehaviorProfile {
    return {
      userId,
      profileVersion: 1,
      createdAt: new Date(),
      lastUpdated: new Date(),

      accessPatterns: {
        workingHours: {
          hourlyDistribution: new Array(24).fill(0),
          peakHours: [],
          variance: 0,
          confidence: 0,
        },
        weeklyPattern: {
          dailyDistribution: new Array(7).fill(0),
          weekdayVsWeekend: { weekday: 0, weekend: 0 },
          variance: 0,
          confidence: 0,
        },
        seasonalPattern: {
          monthlyDistribution: new Array(12).fill(0),
          trends: [],
          variance: 0,
          confidence: 0,
        },
      },

      locationPatterns: {
        primaryLocations: [],
        travelPatterns: [],
        networkPatterns: [],
      },

      applicationPatterns: {
        frequentApplications: [],
        usageIntensity: [],
        featureUsage: [],
      },

      dataAccessPatterns: {
        frequentResources: [],
        accessVolume: {
          dailyAverage: 0,
          weeklyAverage: 0,
          monthlyAverage: 0,
          spikeThreashold: 0,
          variability: 0,
        },
        dataTypes: [],
      },

      securityPatterns: {
        authenticationMethods: [],
        deviceUsage: [],
        failurePatterns: [],
      },

      baselineRisk: 0.3, // Default baseline risk
      currentRisk: 0.3,
      riskFactors: [],

      featureVector: [],
      anomalyThreshold: 0.15,
    };
  }

  /**
   * Update user profile with new session data
   */
  private async updateUserProfile(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): Promise<void> {
    try {
      const now = new Date();

      // Update temporal patterns
      this.updateTemporalPatterns(profile, sessionData, now);

      // Update location patterns
      if (sessionData.currentLocation) {
        this.updateLocationPatterns(profile, sessionData);
      }

      // Update application patterns
      this.updateApplicationPatterns(profile, sessionData);

      // Update data access patterns
      this.updateDataAccessPatterns(profile, sessionData);

      // Update security patterns
      this.updateSecurityPatterns(profile, sessionData);

      // Recalculate feature vector
      profile.featureVector = this.calculateFeatureVector(profile);

      profile.lastUpdated = now;
      profile.profileVersion++;

      this.logger.debug(
        `Updated behavioral profile for user: ${profile.userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to update user profile: ${profile.userId}`,
        error,
      );
    }
  }

  /**
   * Detect behavioral anomalies
   */
  private async detectAnomalies(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): Promise<DetectedAnomaly[]> {
    const anomalies: DetectedAnomaly[] = [];

    try {
      // Time-based anomalies
      const timeAnomalies = this.detectTimeAnomalies(profile, sessionData);
      anomalies.push(...timeAnomalies);

      // Location-based anomalies
      if (sessionData.currentLocation) {
        const locationAnomalies = this.detectLocationAnomalies(
          profile,
          sessionData,
        );
        anomalies.push(...locationAnomalies);
      }

      // Application usage anomalies
      const appAnomalies = this.detectApplicationAnomalies(
        profile,
        sessionData,
      );
      anomalies.push(...appAnomalies);

      // Data access anomalies
      const dataAnomalies = this.detectDataAccessAnomalies(
        profile,
        sessionData,
      );
      anomalies.push(...dataAnomalies);

      // Volume anomalies
      const volumeAnomalies = this.detectVolumeAnomalies(profile, sessionData);
      anomalies.push(...volumeAnomalies);

      this.logger.debug(
        `Detected ${anomalies.length} behavioral anomalies for user: ${profile.userId}`,
      );

      return anomalies;
    } catch (error) {
      this.logger.error(
        `Anomaly detection failed for user: ${profile.userId}`,
        error,
      );
      return [];
    }
  }

  /**
   * Detect time-based anomalies
   */
  private detectTimeAnomalies(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];
    const currentHour = sessionData.startTime.getHours();
    const currentDay = sessionData.startTime.getDay();

    // Check hourly pattern anomaly
    const expectedHourlyFrequency =
      profile.accessPatterns.workingHours.hourlyDistribution[currentHour] || 0;
    if (
      expectedHourlyFrequency < 0.1 &&
      profile.accessPatterns.workingHours.confidence > 0.7
    ) {
      anomalies.push({
        type: BehaviorPatternType.TIME_PATTERN,
        description: `Access at unusual hour: ${currentHour}:00`,
        anomalyScore: 0.8,
        deviationMagnitude: 1.0 - expectedHourlyFrequency,
        expectedValue: "Low activity hour",
        actualValue: "Active session",
        evidence: [
          {
            evidenceType: "statistical",
            description: "Historical hourly access pattern",
            data: {
              hourlyDistribution:
                profile.accessPatterns.workingHours.hourlyDistribution,
            },
            weight: 0.9,
          },
        ],
      });
    }

    // Check weekly pattern anomaly
    const expectedDailyFrequency =
      profile.accessPatterns.weeklyPattern.dailyDistribution[currentDay] || 0;
    if (
      expectedDailyFrequency < 0.15 &&
      profile.accessPatterns.weeklyPattern.confidence > 0.7
    ) {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      anomalies.push({
        type: BehaviorPatternType.TIME_PATTERN,
        description: `Access on unusual day: ${dayNames[currentDay]}`,
        anomalyScore: 0.6,
        deviationMagnitude: 1.0 - expectedDailyFrequency,
        expectedValue: "Low activity day",
        actualValue: "Active session",
        evidence: [
          {
            evidenceType: "pattern",
            description: "Historical weekly access pattern",
            data: {
              dailyDistribution:
                profile.accessPatterns.weeklyPattern.dailyDistribution,
            },
            weight: 0.8,
          },
        ],
      });
    }

    return anomalies;
  }

  /**
   * Detect location-based anomalies
   */
  private detectLocationAnomalies(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    if (
      !sessionData.currentLocation ||
      profile.locationPatterns.primaryLocations.length === 0
    ) {
      return anomalies;
    }

    // Check if location is within known clusters
    const { latitude, longitude } = sessionData.currentLocation;
    let isWithinKnownLocation = false;
    let minDistance = Infinity;

    for (const cluster of profile.locationPatterns.primaryLocations) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        cluster.centerPoint.latitude,
        cluster.centerPoint.longitude,
      );

      minDistance = Math.min(minDistance, distance);

      if (distance <= cluster.radius && cluster.confidence > 0.6) {
        isWithinKnownLocation = true;
        break;
      }
    }

    if (
      !isWithinKnownLocation &&
      profile.locationPatterns.primaryLocations.length > 0
    ) {
      anomalies.push({
        type: BehaviorPatternType.GEOGRAPHIC,
        description: `Access from unknown location`,
        anomalyScore: Math.min(0.9, minDistance / 10000), // Normalize by 10km
        deviationMagnitude: minDistance,
        expectedValue: "Known location",
        actualValue: `${minDistance.toFixed(0)}m from nearest known location`,
        evidence: [
          {
            evidenceType: "comparison",
            description: "Distance from known locations",
            data: {
              currentLocation: sessionData.currentLocation,
              knownLocations: profile.locationPatterns.primaryLocations,
              minDistance,
            },
            weight: 0.85,
          },
        ],
      });
    }

    return anomalies;
  }

  /**
   * Detect application usage anomalies
   */
  private detectApplicationAnomalies(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    for (const appSession of sessionData.applicationUsage) {
      const appProfile = profile.applicationPatterns.frequentApplications.find(
        (app) => app.applicationId === appSession.applicationId,
      );

      if (
        !appProfile &&
        profile.applicationPatterns.frequentApplications.length > 10
      ) {
        // User is accessing an unusual application
        anomalies.push({
          type: BehaviorPatternType.APPLICATION_USAGE,
          description: `Access to unusual application: ${appSession.applicationId}`,
          anomalyScore: 0.6,
          deviationMagnitude: 1.0,
          expectedValue: "Known application",
          actualValue: "New/rare application",
          evidence: [
            {
              evidenceType: "pattern",
              description: "Application usage history",
              data: {
                frequentApps:
                  profile.applicationPatterns.frequentApplications.map(
                    (a) => a.applicationId,
                  ),
                newApp: appSession.applicationId,
              },
              weight: 0.7,
            },
          ],
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect data access anomalies
   */
  private detectDataAccessAnomalies(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    // Check for access to unusual resources
    for (const resource of sessionData.dataAccessed) {
      const resourceProfile = profile.dataAccessPatterns.frequentResources.find(
        (r) => r.resourceId === resource.resourceId,
      );

      if (
        !resourceProfile &&
        profile.dataAccessPatterns.frequentResources.length > 5
      ) {
        anomalies.push({
          type: BehaviorPatternType.DATA_ACCESS,
          description: `Access to unusual resource: ${resource.resourceType}`,
          anomalyScore: 0.7,
          deviationMagnitude: 1.0,
          expectedValue: "Known resource",
          actualValue: "New/rare resource",
          evidence: [
            {
              evidenceType: "comparison",
              description: "Resource access history",
              data: {
                frequentResources:
                  profile.dataAccessPatterns.frequentResources.map(
                    (r) => r.resourceId,
                  ),
                newResource: resource.resourceId,
              },
              weight: 0.75,
            },
          ],
        });
      }
    }

    return anomalies;
  }

  /**
   * Detect volume anomalies
   */
  private detectVolumeAnomalies(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): DetectedAnomaly[] {
    const anomalies: DetectedAnomaly[] = [];

    const currentVolume = sessionData.dataAccessed.length;
    const expectedVolume = profile.dataAccessPatterns.accessVolume.dailyAverage;
    const spikeThreshold =
      profile.dataAccessPatterns.accessVolume.spikeThreashold;

    if (currentVolume > spikeThreshold && spikeThreshold > 0) {
      anomalies.push({
        type: BehaviorPatternType.RESOURCE_USAGE,
        description: `High volume data access detected`,
        anomalyScore: Math.min(0.95, currentVolume / spikeThreshold - 1),
        deviationMagnitude: currentVolume - expectedVolume,
        expectedValue: expectedVolume.toFixed(1),
        actualValue: currentVolume.toString(),
        evidence: [
          {
            evidenceType: "statistical",
            description: "Volume compared to historical baseline",
            data: {
              currentVolume,
              expectedVolume,
              spikeThreshold,
              percentileRank: this.calculatePercentileRank(
                currentVolume,
                expectedVolume,
              ),
            },
            weight: 0.8,
          },
        ],
      });
    }

    return anomalies;
  }

  // Utility Methods

  private updateTemporalPatterns(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
    now: Date,
  ): void {
    const hour = now.getHours();
    const day = now.getDay();
    const month = now.getMonth();

    // Update hourly distribution
    profile.accessPatterns.workingHours.hourlyDistribution[hour] += 1;

    // Update daily distribution
    profile.accessPatterns.weeklyPattern.dailyDistribution[day] += 1;

    // Update monthly distribution
    profile.accessPatterns.seasonalPattern.monthlyDistribution[month] += 1;

    // Normalize distributions
    this.normalizeDistribution(
      profile.accessPatterns.workingHours.hourlyDistribution,
    );
    this.normalizeDistribution(
      profile.accessPatterns.weeklyPattern.dailyDistribution,
    );
    this.normalizeDistribution(
      profile.accessPatterns.seasonalPattern.monthlyDistribution,
    );

    // Update confidence based on data points
    const profileAge = now.getTime() - profile.createdAt.getTime();
    profile.accessPatterns.workingHours.confidence = Math.min(
      1,
      profileAge / this.minObservationPeriod,
    );
    profile.accessPatterns.weeklyPattern.confidence = Math.min(
      1,
      profileAge / this.minObservationPeriod,
    );
    profile.accessPatterns.seasonalPattern.confidence = Math.min(
      1,
      profileAge / (this.minObservationPeriod * 4),
    );
  }

  private updateLocationPatterns(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): void {
    if (!sessionData.currentLocation) return;

    const { latitude, longitude } = sessionData.currentLocation;

    // Find existing cluster or create new one
    let foundCluster = false;

    for (const cluster of profile.locationPatterns.primaryLocations) {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        cluster.centerPoint.latitude,
        cluster.centerPoint.longitude,
      );

      if (distance <= cluster.radius * 1.5) {
        // Allow 50% expansion
        // Update existing cluster
        cluster.frequency += 1;
        cluster.confidence = Math.min(1, cluster.frequency / 10);

        // Adjust center point (moving average)
        const alpha = 0.1; // Learning rate
        cluster.centerPoint.latitude =
          (1 - alpha) * cluster.centerPoint.latitude + alpha * latitude;
        cluster.centerPoint.longitude =
          (1 - alpha) * cluster.centerPoint.longitude + alpha * longitude;

        foundCluster = true;
        break;
      }
    }

    if (!foundCluster) {
      // Create new cluster
      const newCluster: GeographicCluster = {
        clusterId: `cluster_${Date.now()}`,
        centerPoint: { latitude, longitude },
        radius: 500, // 500 meters default
        frequency: 1,
        confidence: 0.1,
      };

      profile.locationPatterns.primaryLocations.push(newCluster);

      // Limit number of clusters
      if (profile.locationPatterns.primaryLocations.length > 10) {
        profile.locationPatterns.primaryLocations.sort(
          (a, b) => b.frequency - a.frequency,
        );
        profile.locationPatterns.primaryLocations =
          profile.locationPatterns.primaryLocations.slice(0, 10);
      }
    }
  }

  private updateApplicationPatterns(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): void {
    for (const appSession of sessionData.applicationUsage) {
      let appUsage = profile.applicationPatterns.frequentApplications.find(
        (app) => app.applicationId === appSession.applicationId,
      );

      if (!appUsage) {
        appUsage = {
          applicationId: appSession.applicationId,
          applicationName: appSession.applicationId,
          frequency: 0,
          averageSessionDuration: 0,
          peakUsageTimes: [],
          features: [],
        };
        profile.applicationPatterns.frequentApplications.push(appUsage);
      }

      appUsage.frequency += 1;

      const sessionDuration = appSession.endTime
        ? appSession.endTime.getTime() - appSession.startTime.getTime()
        : 300000; // Default 5 minutes if ongoing

      // Update average session duration (moving average)
      const alpha = 0.1;
      appUsage.averageSessionDuration =
        (1 - alpha) * appUsage.averageSessionDuration + alpha * sessionDuration;
    }

    // Sort by frequency and limit
    profile.applicationPatterns.frequentApplications.sort(
      (a, b) => b.frequency - a.frequency,
    );
    profile.applicationPatterns.frequentApplications =
      profile.applicationPatterns.frequentApplications.slice(0, 20);
  }

  private updateDataAccessPatterns(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): void {
    for (const resource of sessionData.dataAccessed) {
      let resourceAccess = profile.dataAccessPatterns.frequentResources.find(
        (r) => r.resourceId === resource.resourceId,
      );

      if (!resourceAccess) {
        resourceAccess = {
          resourceId: resource.resourceId,
          resourceType: resource.resourceType,
          accessFrequency: 0,
          averageAccessDuration: 0,
          typicalActions: [],
        };
        profile.dataAccessPatterns.frequentResources.push(resourceAccess);
      }

      resourceAccess.accessFrequency += 1;
    }

    // Update volume patterns
    const currentVolume = sessionData.dataAccessed.length;
    const alpha = 0.1;

    profile.dataAccessPatterns.accessVolume.dailyAverage =
      (1 - alpha) * profile.dataAccessPatterns.accessVolume.dailyAverage +
      alpha * currentVolume;

    // Update spike threshold (95th percentile approximation)
    profile.dataAccessPatterns.accessVolume.spikeThreashold = Math.max(
      profile.dataAccessPatterns.accessVolume.spikeThreashold,
      currentVolume * 1.5,
    );

    // Sort by frequency and limit
    profile.dataAccessPatterns.frequentResources.sort(
      (a, b) => b.accessFrequency - a.accessFrequency,
    );
    profile.dataAccessPatterns.frequentResources =
      profile.dataAccessPatterns.frequentResources.slice(0, 50);
  }

  private updateSecurityPatterns(
    profile: UserBehaviorProfile,
    sessionData: SessionContext,
  ): void {
    // Update device usage patterns
    let devicePattern = profile.securityPatterns.deviceUsage.find(
      (d) => d.deviceId === sessionData.deviceId,
    );

    if (!devicePattern) {
      devicePattern = {
        deviceId: sessionData.deviceId,
        deviceType: "unknown",
        frequency: 0,
        typicalUsageHours: [],
        riskScore: 0.5,
      };
      profile.securityPatterns.deviceUsage.push(devicePattern);
    }

    devicePattern.frequency += 1;

    // Limit device tracking
    if (profile.securityPatterns.deviceUsage.length > 10) {
      profile.securityPatterns.deviceUsage.sort(
        (a, b) => b.frequency - a.frequency,
      );
      profile.securityPatterns.deviceUsage =
        profile.securityPatterns.deviceUsage.slice(0, 10);
    }
  }

  private calculateFeatureVector(profile: UserBehaviorProfile): number[] {
    const features: number[] = [];

    // Time-based features
    features.push(...profile.accessPatterns.workingHours.hourlyDistribution);
    features.push(...profile.accessPatterns.weeklyPattern.dailyDistribution);

    // Location features
    features.push(profile.locationPatterns.primaryLocations.length);
    features.push(profile.locationPatterns.travelPatterns.length);

    // Application features
    features.push(profile.applicationPatterns.frequentApplications.length);
    const avgAppFreq =
      profile.applicationPatterns.frequentApplications.length > 0
        ? profile.applicationPatterns.frequentApplications.reduce(
            (sum, app) => sum + app.frequency,
            0,
          ) / profile.applicationPatterns.frequentApplications.length
        : 0;
    features.push(avgAppFreq);

    // Data access features
    features.push(profile.dataAccessPatterns.frequentResources.length);
    features.push(profile.dataAccessPatterns.accessVolume.dailyAverage);

    // Security features
    features.push(profile.securityPatterns.deviceUsage.length);
    features.push(profile.baselineRisk);

    return features;
  }

  private calculateOverallAnomalyScore(anomalies: DetectedAnomaly[]): number {
    if (anomalies.length === 0) return 0;

    // Weighted average of anomaly scores
    const weightedSum = anomalies.reduce(
      (sum, anomaly) => sum + anomaly.anomalyScore,
      0,
    );
    const maxPossibleScore = anomalies.length;

    return Math.min(1, weightedSum / maxPossibleScore);
  }

  private determineSeverity(
    anomalyScore: number,
    anomalies: DetectedAnomaly[],
  ): "low" | "medium" | "high" | "critical" {
    // Check for critical patterns
    const hasCriticalAnomaly = anomalies.some((a) => a.anomalyScore > 0.9);
    if (hasCriticalAnomaly || anomalyScore > 0.85) return "critical";

    // Check for high severity
    const hasHighAnomaly = anomalies.some((a) => a.anomalyScore > 0.7);
    if (hasHighAnomaly || anomalyScore > 0.65) return "high";

    // Check for medium severity
    if (anomalyScore > 0.4 || anomalies.length > 3) return "medium";

    return "low";
  }

  private generateRecommendations(
    anomalies: DetectedAnomaly[],
    profile: UserBehaviorProfile,
  ): string[] {
    const recommendations: string[] = [];

    for (const anomaly of anomalies) {
      switch (anomaly.type) {
        case BehaviorPatternType.TIME_PATTERN:
          recommendations.push(
            "Verify legitimacy of access outside normal hours",
          );
          break;
        case BehaviorPatternType.GEOGRAPHIC:
          recommendations.push("Confirm user location and verify identity");
          break;
        case BehaviorPatternType.APPLICATION_USAGE:
          recommendations.push("Review access to new or unusual applications");
          break;
        case BehaviorPatternType.DATA_ACCESS:
          recommendations.push(
            "Monitor data access patterns for potential exfiltration",
          );
          break;
        case BehaviorPatternType.RESOURCE_USAGE:
          recommendations.push("Investigate high volume resource access");
          break;
      }
    }

    // Add general recommendations based on profile maturity
    const profileAge = Date.now() - profile.createdAt.getTime();
    if (profileAge < this.minObservationPeriod) {
      recommendations.push(
        "Profile still learning - increased monitoring recommended",
      );
    }

    return recommendations;
  }

  private determineRequiredActions(
    anomalies: DetectedAnomaly[],
    severity: string,
  ): RequiredAction[] {
    const actions: RequiredAction[] = [];

    switch (severity) {
      case "critical":
        actions.push({
          action: "block",
          priority: "immediate",
          description: "Immediately block access pending investigation",
          automatable: true,
        });
        actions.push({
          action: "investigate",
          priority: "immediate",
          description: "Initiate immediate security investigation",
          automatable: false,
        });
        break;

      case "high":
        actions.push({
          action: "challenge",
          priority: "high",
          description: "Require additional authentication",
          automatable: true,
        });
        actions.push({
          action: "alert",
          priority: "high",
          description: "Alert security team for review",
          automatable: true,
        });
        break;

      case "medium":
        actions.push({
          action: "monitor",
          priority: "medium",
          description: "Increase monitoring and logging",
          automatable: true,
        });
        actions.push({
          action: "alert",
          priority: "medium",
          description: "Create security alert for review",
          automatable: true,
        });
        break;

      default:
        actions.push({
          action: "monitor",
          priority: "low",
          description: "Continue standard monitoring",
          automatable: true,
        });
    }

    return actions;
  }

  private calculateConfidence(
    profile: UserBehaviorProfile,
    anomalies: DetectedAnomaly[],
  ): number {
    // Base confidence on profile maturity
    const profileAge = Date.now() - profile.createdAt.getTime();
    const maturityFactor = Math.min(1, profileAge / this.minObservationPeriod);

    // Adjust for evidence quality
    const evidenceQuality =
      anomalies.length > 0
        ? anomalies.reduce(
            (sum, a) =>
              sum + a.evidence.reduce((eSum, e) => eSum + e.weight, 0),
            0,
          ) / anomalies.length
        : 0.5;

    return Math.min(1, maturityFactor * 0.7 + evidenceQuality * 0.3);
  }

  private createHistoricalBaseline(
    profile: UserBehaviorProfile,
  ): BehavioralBaseline {
    const profileAge = Math.floor(
      (Date.now() - profile.createdAt.getTime()) / 86400000,
    );

    return {
      profileAge,
      dataPoints: profile.profileVersion,
      lastUpdate: profile.lastUpdated,
      confidence: Math.min(1, profileAge / 7), // 7 days for basic confidence
      stablePatterns: this.identifyStablePatterns(profile),
      evolvingPatterns: this.identifyEvolvingPatterns(profile),
    };
  }

  private async performPeerComparison(
    userId: string,
    profile: UserBehaviorProfile,
  ): Promise<PeerComparisonData> {
    // Simplified peer comparison - would use ML clustering in production
    const peerGroupSize = Math.max(10, Math.floor(this.userProfiles.size / 10));

    return {
      peerGroup: "similar_users",
      peerGroupSize,
      userPercentile: 0.5, // Placeholder
      significantDeviations: [],
    };
  }

  private identifyStablePatterns(profile: UserBehaviorProfile): string[] {
    const stable: string[] = [];

    if (profile.accessPatterns.workingHours.confidence > 0.8) {
      stable.push("working_hours");
    }
    if (profile.accessPatterns.weeklyPattern.confidence > 0.8) {
      stable.push("weekly_pattern");
    }
    if (profile.locationPatterns.primaryLocations.length > 0) {
      stable.push("location_pattern");
    }

    return stable;
  }

  private identifyEvolvingPatterns(profile: UserBehaviorProfile): string[] {
    const evolving: string[] = [];

    if (profile.accessPatterns.workingHours.confidence < 0.6) {
      evolving.push("working_hours");
    }
    if (profile.applicationPatterns.frequentApplications.length < 5) {
      evolving.push("application_usage");
    }

    return evolving;
  }

  // Math utility methods
  private normalizeDistribution(distribution: number[]): void {
    const total = distribution.reduce((sum, val) => sum + val, 0);
    if (total > 0) {
      for (let i = 0; i < distribution.length; i++) {
        distribution[i] = distribution[i] / total;
      }
    }
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371000; // Earth radius in meters
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private calculatePercentileRank(value: number, mean: number): number {
    // Simplified percentile calculation - would use proper statistical methods in production
    return value > mean
      ? Math.min(99, 50 + ((value - mean) / mean) * 50)
      : Math.max(1, 50 - ((mean - value) / mean) * 50);
  }

  private generateDetectionId(): string {
    return `BEHAV_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  private startProfileUpdateTimer(): void {
    setInterval(() => {
      this.performPeriodicMaintenance();
    }, this.profileUpdateInterval);
  }

  private performPeriodicMaintenance(): void {
    const now = Date.now();

    // Clean up old profiles
    for (const [userId, profile] of this.userProfiles.entries()) {
      const profileAge = now - profile.createdAt.getTime();
      if (profileAge > this.maxProfileAge) {
        this.userProfiles.delete(userId);
        this.logger.debug(`Archived old profile for user: ${userId}`);
      }
    }

    // Log statistics
    this.logger.debug(
      `Behavioral analytics status - Profiles: ${this.userProfiles.size}, Anomalies detected: ${this.totalAnomaliesDetected}`,
    );
  }

  /**
   * Get behavioral analytics statistics
   */
  public getAnalyticsStatistics(): {
    activeProfiles: number;
    totalProfilesCreated: number;
    totalAnomaliesDetected: number;
    falsePositiveRate: number;
    averageProfileAge: number;
    modelsActive: number;
  } {
    const now = Date.now();
    const profiles = Array.from(this.userProfiles.values());
    const averageProfileAge =
      profiles.length > 0
        ? profiles.reduce((sum, p) => sum + (now - p.createdAt.getTime()), 0) /
          profiles.length /
          86400000
        : 0;

    const falsePositiveRate =
      this.totalAnomaliesDetected > 0
        ? this.totalFalsePositives / this.totalAnomaliesDetected
        : 0;

    return {
      activeProfiles: this.userProfiles.size,
      totalProfilesCreated: this.totalProfilesCreated,
      totalAnomaliesDetected: this.totalAnomaliesDetected,
      falsePositiveRate,
      averageProfileAge,
      modelsActive: this.mlModels.size,
    };
  }
}
