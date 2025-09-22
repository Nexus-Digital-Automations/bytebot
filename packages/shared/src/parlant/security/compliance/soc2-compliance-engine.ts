/**
 * SOC2 Type II Compliance Engine
 *
 * Implements comprehensive SOC2 Type II Trust Service Criteria with
 * automated control monitoring, evidence collection, and compliance reporting
 *
 * @fileoverview SOC2 Compliance Engine
 * @version 2.0.0
 * @author PARLANT Compliance Specialist
 */

import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

/**
 * SOC2 Trust Service Criteria
 */
export enum TrustServiceCriteria {
  SECURITY = "security",
  AVAILABILITY = "availability",
  PROCESSING_INTEGRITY = "processing_integrity",
  CONFIDENTIALITY = "confidentiality",
  PRIVACY = "privacy",
}

/**
 * SOC2 Control Category
 */
export enum SOC2ControlCategory {
  // Common Criteria (CC)
  CC1_CONTROL_ENVIRONMENT = "CC1",
  CC2_COMMUNICATION_INFORMATION = "CC2",
  CC3_RISK_ASSESSMENT = "CC3",
  CC4_MONITORING_ACTIVITIES = "CC4",
  CC5_CONTROL_ACTIVITIES = "CC5",
  CC6_LOGICAL_PHYSICAL_ACCESS = "CC6",
  CC7_SYSTEM_OPERATIONS = "CC7",
  CC8_CHANGE_MANAGEMENT = "CC8",
  CC9_RISK_MITIGATION = "CC9",

  // Additional Criteria
  A1_AVAILABILITY_PROCESSING = "A1",
  PI1_PROCESSING_INTEGRITY = "PI1",
  C1_CONFIDENTIALITY = "C1",
  P1_PRIVACY_COLLECTION = "P1",
  P2_PRIVACY_USE = "P2",
  P3_PRIVACY_RETENTION = "P3",
  P4_PRIVACY_DISCLOSURE = "P4",
  P5_PRIVACY_QUALITY = "P5",
  P6_PRIVACY_MONITORING = "P6",
  P7_PRIVACY_INCIDENTS = "P7",
}

/**
 * SOC2 Control Implementation
 */
export interface SOC2Control {
  id: string;
  category: SOC2ControlCategory;
  criteria: TrustServiceCriteria;
  title: string;
  description: string;
  implementationStatus:
    | "not_implemented"
    | "in_progress"
    | "implemented"
    | "effective";
  operatingEffectiveness: number; // 0-1 scale
  lastAssessment: Date;
  evidencePoints: SOC2Evidence[];
  exceptions: SOC2Exception[];
  remediation?: {
    plan: string;
    timeline: Date;
    responsible: string;
    status: "pending" | "in_progress" | "completed";
  };
}

/**
 * SOC2 Evidence Collection
 */
export interface SOC2Evidence {
  id: string;
  controlId: string;
  type:
    | "policy"
    | "procedure"
    | "log"
    | "configuration"
    | "test_result"
    | "documentation";
  title: string;
  description: string;
  collectionDate: Date;
  source: string;
  integrity_hash: string;
  retention_period: number;
  automated: boolean;
  metadata: Record<string, unknown>;
}

/**
 * SOC2 Exception/Deficiency
 */
export interface SOC2Exception {
  id: string;
  controlId: string;
  severity: "low" | "medium" | "high" | "critical";
  type: "design_deficiency" | "operating_deficiency" | "material_weakness";
  description: string;
  risk_rating: number;
  discovered_date: Date;
  remediation_plan?: string;
  target_resolution_date?: Date;
  status: "open" | "remediated" | "accepted_risk";
}

/**
 * SOC2 Compliance Assessment Result
 */
export interface SOC2ComplianceResult {
  assessmentId: string;
  period: {
    start: Date;
    end: Date;
  };
  criteria: TrustServiceCriteria[];
  overallScore: number;
  controlResults: Map<
    string,
    {
      score: number;
      effectiveness: number;
      exceptions: number;
    }
  >;
  evidenceCount: number;
  exceptionsCount: number;
  recommendations: string[];
  auditReadiness: boolean;
  nextAssessment: Date;
  generatedAt: Date;
}

@Injectable()
export class SOC2ComplianceEngine {
  private readonly logger = new Logger(SOC2ComplianceEngine.name);
  private readonly eventEmitter: EventEmitter2;

  private controls: Map<string, SOC2Control> = new Map();
  private evidence: Map<string, SOC2Evidence> = new Map();
  private exceptions: Map<string, SOC2Exception> = new Map();

  constructor(eventEmitter: EventEmitter2) {
    this.eventEmitter = eventEmitter;
    this.initializeSOC2Controls();
    this.logger.log("SOC2 Type II Compliance Engine initialized");
  }

  /**
   * Initialize standard SOC2 controls
   */
  private initializeSOC2Controls(): void {
    const standardControls: Partial<SOC2Control>[] = [
      // Security Controls (Common Criteria)
      {
        id: "CC6.1",
        category: SOC2ControlCategory.CC6_LOGICAL_PHYSICAL_ACCESS,
        criteria: TrustServiceCriteria.SECURITY,
        title: "Logical and Physical Access Controls",
        description:
          "Controls provide reasonable assurance that access to information and system resources is restricted to authorized users",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.95,
      },
      {
        id: "CC6.2",
        category: SOC2ControlCategory.CC6_LOGICAL_PHYSICAL_ACCESS,
        criteria: TrustServiceCriteria.SECURITY,
        title: "System Passwords",
        description:
          "Prior to issuing system credentials and granting system access, the entity registers and authorizes new users",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.98,
      },
      {
        id: "CC6.3",
        category: SOC2ControlCategory.CC6_LOGICAL_PHYSICAL_ACCESS,
        criteria: TrustServiceCriteria.SECURITY,
        title: "Network Security Controls",
        description:
          "The entity authorizes, manages, and removes access to data, software, functions, and services",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.92,
      },
      {
        id: "CC6.7",
        category: SOC2ControlCategory.CC6_LOGICAL_PHYSICAL_ACCESS,
        criteria: TrustServiceCriteria.SECURITY,
        title: "Data Transmission and Disposal",
        description:
          "The entity restricts the transmission, movement, and removal of information to authorized internal and external users",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.94,
      },
      {
        id: "CC6.8",
        category: SOC2ControlCategory.CC6_LOGICAL_PHYSICAL_ACCESS,
        criteria: TrustServiceCriteria.SECURITY,
        title: "System Activity Monitoring",
        description:
          "The entity implements controls to prevent or detect and act upon the introduction of unauthorized or malicious software",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.96,
      },

      // Availability Controls
      {
        id: "A1.1",
        category: SOC2ControlCategory.A1_AVAILABILITY_PROCESSING,
        criteria: TrustServiceCriteria.AVAILABILITY,
        title: "Availability Monitoring",
        description:
          "The entity maintains, monitors, and evaluates current processing capacity and use of system components",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.93,
      },
      {
        id: "A1.2",
        category: SOC2ControlCategory.A1_AVAILABILITY_PROCESSING,
        criteria: TrustServiceCriteria.AVAILABILITY,
        title: "System Recovery",
        description:
          "The entity authorizes, designs, develops or acquires, implements, operates, approves, maintains, and monitors environmental protections",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.91,
      },

      // Processing Integrity Controls
      {
        id: "PI1.1",
        category: SOC2ControlCategory.PI1_PROCESSING_INTEGRITY,
        criteria: TrustServiceCriteria.PROCESSING_INTEGRITY,
        title: "Data Input Validation",
        description:
          "The entity implements controls over system inputs to provide reasonable assurance that data and transactions are valid",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.97,
      },

      // Confidentiality Controls
      {
        id: "C1.1",
        category: SOC2ControlCategory.C1_CONFIDENTIALITY,
        criteria: TrustServiceCriteria.CONFIDENTIALITY,
        title: "Confidentiality Protection",
        description:
          "The entity identifies and maintains confidential information to meet the entity's objectives",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.95,
      },

      // Privacy Controls
      {
        id: "P1.1",
        category: SOC2ControlCategory.P1_PRIVACY_COLLECTION,
        criteria: TrustServiceCriteria.PRIVACY,
        title: "Privacy Notice",
        description:
          "The entity provides notice about its privacy practices to data subjects",
        implementationStatus: "implemented",
        operatingEffectiveness: 0.94,
      },
    ];

    standardControls.forEach((controlData) => {
      const control: SOC2Control = {
        ...controlData,
        lastAssessment: new Date(),
        evidencePoints: [],
        exceptions: [],
      } as SOC2Control;

      this.controls.set(control.id, control);
    });

    this.logger.log(`Initialized ${this.controls.size} SOC2 controls`);
  }

  /**
   * Perform comprehensive SOC2 compliance assessment
   */
  public async performComplianceAssessment(
    criteria: TrustServiceCriteria[] = Object.values(TrustServiceCriteria),
    period?: { start: Date; end: Date },
  ): Promise<SOC2ComplianceResult> {
    const assessmentId = this.generateAssessmentId();
    const assessmentPeriod = period || {
      start: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      end: new Date(),
    };

    this.logger.log(`Starting SOC2 compliance assessment: ${assessmentId}`);

    try {
      // Filter controls by criteria
      const relevantControls = Array.from(this.controls.values()).filter(
        (control) => criteria.includes(control.criteria),
      );

      // Assess each control
      const controlResults = new Map<
        string,
        { score: number; effectiveness: number; exceptions: number }
      >();
      let totalScore = 0;
      let totalEvidence = 0;
      let totalExceptions = 0;

      for (const control of relevantControls) {
        const assessment = await this.assessControl(control, assessmentPeriod);
        controlResults.set(control.id, assessment);
        totalScore += assessment.score;
        totalEvidence += control.evidencePoints.length;
        totalExceptions += control.exceptions.length;
      }

      const overallScore =
        relevantControls.length > 0 ? totalScore / relevantControls.length : 0;

      // Generate recommendations
      const recommendations = this.generateRecommendations(relevantControls);

      // Determine audit readiness
      const auditReadiness = overallScore >= 0.9 && totalExceptions === 0;

      const result: SOC2ComplianceResult = {
        assessmentId,
        period: assessmentPeriod,
        criteria,
        overallScore,
        controlResults,
        evidenceCount: totalEvidence,
        exceptionsCount: totalExceptions,
        recommendations,
        auditReadiness,
        nextAssessment: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        generatedAt: new Date(),
      };

      this.logger.log(
        `SOC2 assessment completed - Score: ${(overallScore * 100).toFixed(1)}%, Audit Ready: ${auditReadiness}`,
      );

      // Emit compliance event
      this.eventEmitter.emit("compliance.soc2.assessment.completed", {
        assessmentId,
        score: overallScore,
        auditReadiness,
        criteria: criteria.length,
      });

      return result;
    } catch (error) {
      this.logger.error(`SOC2 assessment failed: ${assessmentId}`, error);
      throw new Error(`SOC2 compliance assessment failed: ${error.message}`);
    }
  }

  /**
   * Assess individual control effectiveness
   */
  private async assessControl(
    control: SOC2Control,
    period: { start: Date; end: Date },
  ): Promise<{ score: number; effectiveness: number; exceptions: number }> {
    // Collect evidence for the period
    const relevantEvidence = control.evidencePoints.filter(
      (evidence) =>
        evidence.collectionDate >= period.start &&
        evidence.collectionDate <= period.end,
    );

    // Count exceptions in the period
    const relevantExceptions = control.exceptions.filter(
      (exception) =>
        exception.discovered_date >= period.start &&
        exception.discovered_date <= period.end,
    );

    // Calculate score based on implementation status, evidence, and exceptions
    let score = 0;

    switch (control.implementationStatus) {
      case "implemented":
        score = 0.8;
        break;
      case "effective":
        score = 1.0;
        break;
      case "in_progress":
        score = 0.5;
        break;
      default:
        score = 0;
    }

    // Adjust score based on evidence sufficiency
    const evidenceWeight = Math.min(relevantEvidence.length / 10, 1); // Assuming 10 evidence points is optimal
    score *= 0.5 + 0.5 * evidenceWeight;

    // Penalize for exceptions
    const exceptionPenalty = relevantExceptions.reduce((penalty, exception) => {
      switch (exception.severity) {
        case "critical":
          return penalty + 0.3;
        case "high":
          return penalty + 0.2;
        case "medium":
          return penalty + 0.1;
        case "low":
          return penalty + 0.05;
        default:
          return penalty;
      }
    }, 0);

    score = Math.max(0, score - exceptionPenalty);

    return {
      score,
      effectiveness: control.operatingEffectiveness,
      exceptions: relevantExceptions.length,
    };
  }

  /**
   * Collect evidence for a specific control
   */
  public async collectEvidence(
    controlId: string,
    evidenceData: Partial<SOC2Evidence>,
  ): Promise<string> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const evidenceId = this.generateEvidenceId();
    const evidence: SOC2Evidence = {
      id: evidenceId,
      controlId,
      type: evidenceData.type || "documentation",
      title: evidenceData.title || "Evidence",
      description: evidenceData.description || "",
      collectionDate: new Date(),
      source: evidenceData.source || "manual",
      integrity_hash: this.calculateIntegrityHash(evidenceData),
      retention_period: evidenceData.retention_period || 2555200000, // 7 years default
      automated: evidenceData.automated || false,
      metadata: evidenceData.metadata || {},
    };

    this.evidence.set(evidenceId, evidence);
    control.evidencePoints.push(evidence);

    this.logger.log(
      `Evidence collected for control ${controlId}: ${evidenceId}`,
    );
    return evidenceId;
  }

  /**
   * Report control exception/deficiency
   */
  public async reportException(
    controlId: string,
    exceptionData: Partial<SOC2Exception>,
  ): Promise<string> {
    const control = this.controls.get(controlId);
    if (!control) {
      throw new Error(`Control not found: ${controlId}`);
    }

    const exceptionId = this.generateExceptionId();
    const exception: SOC2Exception = {
      id: exceptionId,
      controlId,
      severity: exceptionData.severity || "medium",
      type: exceptionData.type || "operating_deficiency",
      description: exceptionData.description || "",
      risk_rating: exceptionData.risk_rating || 0.5,
      discovered_date: new Date(),
      status: "open",
      ...exceptionData,
    };

    this.exceptions.set(exceptionId, exception);
    control.exceptions.push(exception);

    this.logger.warn(
      `Exception reported for control ${controlId}: ${exceptionId} (${exception.severity})`,
    );

    // Emit exception event
    this.eventEmitter.emit("compliance.soc2.exception.reported", {
      exceptionId,
      controlId,
      severity: exception.severity,
    });

    return exceptionId;
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(controls: SOC2Control[]): string[] {
    const recommendations: string[] = [];

    // Check for controls with low effectiveness
    const lowEffectivenessControls = controls.filter(
      (c) => c.operatingEffectiveness < 0.8,
    );
    if (lowEffectivenessControls.length > 0) {
      recommendations.push(
        `Improve operating effectiveness for ${lowEffectivenessControls.length} controls`,
      );
    }

    // Check for insufficient evidence
    const lowEvidenceControls = controls.filter(
      (c) => c.evidencePoints.length < 5,
    );
    if (lowEvidenceControls.length > 0) {
      recommendations.push(
        `Collect additional evidence for ${lowEvidenceControls.length} controls`,
      );
    }

    // Check for open exceptions
    const controlsWithExceptions = controls.filter((c) =>
      c.exceptions.some((e) => e.status === "open"),
    );
    if (controlsWithExceptions.length > 0) {
      recommendations.push(
        `Address open exceptions in ${controlsWithExceptions.length} controls`,
      );
    }

    // Check for controls needing remediation
    const controlsNeedingRemediation = controls.filter(
      (c) => c.remediation && c.remediation.status !== "completed",
    );
    if (controlsNeedingRemediation.length > 0) {
      recommendations.push(
        `Complete remediation plans for ${controlsNeedingRemediation.length} controls`,
      );
    }

    return recommendations;
  }

  /**
   * Get compliance status for specific criteria
   */
  public getComplianceStatus(criteria: TrustServiceCriteria): {
    controlsCount: number;
    implementedCount: number;
    effectiveCount: number;
    evidenceCount: number;
    exceptionsCount: number;
  } {
    const relevantControls = Array.from(this.controls.values()).filter(
      (control) => control.criteria === criteria,
    );

    return {
      controlsCount: relevantControls.length,
      implementedCount: relevantControls.filter(
        (c) =>
          c.implementationStatus === "implemented" ||
          c.implementationStatus === "effective",
      ).length,
      effectiveCount: relevantControls.filter(
        (c) => c.implementationStatus === "effective",
      ).length,
      evidenceCount: relevantControls.reduce(
        (sum, c) => sum + c.evidencePoints.length,
        0,
      ),
      exceptionsCount: relevantControls.reduce(
        (sum, c) =>
          sum + c.exceptions.filter((e) => e.status === "open").length,
        0,
      ),
    };
  }

  // Utility methods
  private generateAssessmentId(): string {
    return `SOC2_ASSESS_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  private generateEvidenceId(): string {
    return `SOC2_EVID_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  private generateExceptionId(): string {
    return `SOC2_EXC_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`.toUpperCase();
  }

  private calculateIntegrityHash(data: unknown): string {
    // Simple hash calculation - in production, use cryptographic hash
    return `hash_${JSON.stringify(data).length}_${Date.now()}`;
  }
}
