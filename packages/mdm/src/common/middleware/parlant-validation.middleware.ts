/**
 * PARLANT Validation Middleware
 * Integrates conversational AI validation for all MDM operations
 */

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface ParlantValidationRequest {
  operation: string;
  resource: string;
  context: {
    deviceId?: string;
    userId?: string;
    policyId?: string;
    applicationId?: string;
    securityLevel?: string;
    [key: string]: any;
  };
  parameters: any;
}

export interface ParlantValidationResponse {
  approved: boolean;
  confidence: number;
  reasoning?: string;
  recommendations?: string[];
  risks?: string[];
  alternativeActions?: string[];
}

@Injectable()
export class ParlantValidationMiddleware implements NestMiddleware {
  private readonly logger = new Logger('ParlantValidation');

  use(req: Request, res: Response, next: NextFunction): void {
    // Skip validation for health checks and documentation
    if (this.shouldSkipValidation(req.path)) {
      return next();
    }

    // Extract operation context
    const validationRequest = this.buildValidationRequest(req);

    // Perform PARLANT validation
    this.validateWithParlant(validationRequest)
      .then((validation) => {
        if (validation.approved) {
          // Add validation context to request
          req['parlantValidation'] = validation;
          this.logger.log(`PARLANT approved: ${validationRequest.operation}`, {
            confidence: validation.confidence,
            operation: validationRequest.operation
          });
          next();
        } else {
          // Block request with validation response
          this.logger.warn(`PARLANT blocked: ${validationRequest.operation}`, {
            reasoning: validation.reasoning,
            operation: validationRequest.operation
          });

          res.status(403).json({
            error: 'Operation blocked by conversational validation',
            reasoning: validation.reasoning,
            recommendations: validation.recommendations,
            risks: validation.risks,
            alternativeActions: validation.alternativeActions
          });
        }
      })
      .catch((error) => {
        this.logger.error('PARLANT validation error', error.stack, {
          operation: validationRequest.operation
        });

        // In case of validation service failure, allow operation but log
        this.logger.warn('Proceeding without PARLANT validation due to service error');
        next();
      });
  }

  private shouldSkipValidation(path: string): boolean {
    const skipPaths = [
      '/health',
      '/readiness',
      '/liveness',
      '/api/docs',
      '/favicon.ico'
    ];

    return skipPaths.some(skipPath => path.startsWith(skipPath));
  }

  private buildValidationRequest(req: Request): ParlantValidationRequest {
    const operation = this.extractOperation(req);
    const resource = this.extractResource(req);
    const context = this.extractContext(req);

    return {
      operation,
      resource,
      context,
      parameters: {
        method: req.method,
        body: req.body,
        query: req.query,
        params: req.params
      }
    };
  }

  private extractOperation(req: Request): string {
    const method = req.method.toLowerCase();
    const path = req.path;

    // Map HTTP methods and paths to MDM operations
    const operationMap: Record<string, string> = {
      'post:/api/v1/devices/enroll': 'device_enrollment',
      'delete:/api/v1/devices': 'device_wipe',
      'post:/api/v1/policies': 'policy_creation',
      'put:/api/v1/policies': 'policy_update',
      'post:/api/v1/applications/install': 'application_installation',
      'delete:/api/v1/applications': 'application_removal',
      'post:/api/v1/security/remote-wipe': 'remote_wipe_request',
      'post:/api/v1/compliance/audit': 'compliance_audit'
    };

    const operationKey = `${method}:${path}`;
    return operationMap[operationKey] || `${method}_${path.split('/').pop()}`;
  }

  private extractResource(req: Request): string {
    const pathSegments = req.path.split('/').filter(Boolean);
    return pathSegments[pathSegments.length - 2] || pathSegments[pathSegments.length - 1] || 'unknown';
  }

  private extractContext(req: Request): any {
    const user = req['user'];
    const deviceId = req.params?.deviceId || req.body?.deviceId;
    const policyId = req.params?.policyId || req.body?.policyId;

    return {
      userId: user?.id,
      userRole: user?.role,
      deviceId,
      policyId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date().toISOString(),
      sessionId: req.headers['x-session-id']
    };
  }

  private async validateWithParlant(request: ParlantValidationRequest): Promise<ParlantValidationResponse> {
    // Simulated PARLANT integration - replace with actual service call
    const riskLevel = this.assessRiskLevel(request);
    const confidence = this.calculateConfidence(request);

    // High-risk operations require stricter validation
    if (riskLevel === 'high' || riskLevel === 'critical') {
      return this.performStrictValidation(request, confidence);
    }

    // Standard validation for medium/low risk operations
    return this.performStandardValidation(request, confidence);
  }

  private assessRiskLevel(request: ParlantValidationRequest): 'low' | 'medium' | 'high' | 'critical' {
    const highRiskOperations = [
      'device_wipe',
      'remote_wipe_request',
      'policy_deletion',
      'security_policy_modification'
    ];

    const mediumRiskOperations = [
      'policy_creation',
      'policy_update',
      'application_installation',
      'device_enrollment'
    ];

    if (highRiskOperations.includes(request.operation)) {
      return 'high';
    }

    if (mediumRiskOperations.includes(request.operation)) {
      return 'medium';
    }

    return 'low';
  }

  private calculateConfidence(request: ParlantValidationRequest): number {
    // Base confidence on context completeness and operation type
    let confidence = 0.7;

    if (request.context.userId) confidence += 0.1;
    if (request.context.deviceId) confidence += 0.1;
    if (request.context.userRole) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private async performStrictValidation(
    request: ParlantValidationRequest,
    confidence: number
  ): Promise<ParlantValidationResponse> {
    // Strict validation for high-risk operations
    return {
      approved: confidence > 0.8,
      confidence,
      reasoning: confidence > 0.8
        ? 'High-risk operation approved with sufficient context'
        : 'High-risk operation requires additional verification',
      recommendations: confidence <= 0.8 ? [
        'Verify user identity through secondary authentication',
        'Confirm operation with device owner',
        'Review security policies before proceeding'
      ] : [],
      risks: [
        'Potential data loss',
        'Device accessibility impact',
        'Compliance implications'
      ]
    };
  }

  private async performStandardValidation(
    request: ParlantValidationRequest,
    confidence: number
  ): Promise<ParlantValidationResponse> {
    // Standard validation for normal operations
    return {
      approved: confidence > 0.6,
      confidence,
      reasoning: confidence > 0.6
        ? 'Operation approved with standard validation'
        : 'Operation requires additional context',
      recommendations: confidence <= 0.6 ? [
        'Provide additional operation context',
        'Verify user permissions'
      ] : []
    };
  }
}