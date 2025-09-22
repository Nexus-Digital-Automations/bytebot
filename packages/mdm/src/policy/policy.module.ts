/**
 * Policy Management Module
 * Handles device policy configuration, enforcement, and compliance monitoring
 *
 * Agent 4: Policy Management & Compliance Enforcement System
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { Policy } from './entities/policy.entity';
import { PolicyTemplate } from './entities/policy-template.entity';
import { PolicyAssignment } from './entities/policy-assignment.entity';
import { PolicyCompliance } from './entities/policy-compliance.entity';
import { PolicyRule } from './entities/policy-rule.entity';
import { PolicyViolation } from './entities/policy-violation.entity';

// Controllers
import { PolicyController } from './controllers/policy.controller';
import { PolicyTemplateController } from './controllers/policy-template.controller';
import { PolicyComplianceController } from './controllers/policy-compliance.controller';
import { PolicyEnforcementController } from './controllers/policy-enforcement.controller';

// Services
import { PolicyService } from './services/policy.service';
import { PolicyTemplateService } from './services/policy-template.service';
import { PolicyAssignmentService } from './services/policy-assignment.service';
import { PolicyComplianceService } from './services/policy-compliance.service';
import { PolicyEnforcementService } from './services/policy-enforcement.service';
import { PolicyValidationService } from './services/policy-validation.service';
import { PolicyEvaluationService } from './services/policy-evaluation.service';
import { PolicyReportingService } from './services/policy-reporting.service';

// Repositories
import { PolicyRepository } from './repositories/policy.repository';
import { PolicyComplianceRepository } from './repositories/policy-compliance.repository';

// Guards and Interceptors
import { PolicyAccessGuard } from './guards/policy-access.guard';
import { PolicyEnforcementGuard } from './guards/policy-enforcement.guard';
import { PolicyComplianceInterceptor } from './interceptors/policy-compliance.interceptor';

// Event Handlers
import { PolicyEventHandler } from './handlers/policy-event.handler';
import { ComplianceEventHandler } from './handlers/compliance-event.handler';

/**
 * Policy Management Module
 * Comprehensive policy lifecycle management with enforcement and compliance monitoring
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Policy,
      PolicyTemplate,
      PolicyAssignment,
      PolicyCompliance,
      PolicyRule,
      PolicyViolation
    ])
  ],
  controllers: [
    PolicyController,
    PolicyTemplateController,
    PolicyComplianceController,
    PolicyEnforcementController
  ],
  providers: [
    // Core services
    PolicyService,
    PolicyTemplateService,
    PolicyAssignmentService,
    PolicyComplianceService,
    PolicyEnforcementService,
    PolicyValidationService,
    PolicyEvaluationService,
    PolicyReportingService,

    // Repositories
    PolicyRepository,
    PolicyComplianceRepository,

    // Security and compliance
    PolicyAccessGuard,
    PolicyEnforcementGuard,
    PolicyComplianceInterceptor,

    // Event handlers
    PolicyEventHandler,
    ComplianceEventHandler
  ],
  exports: [
    PolicyService,
    PolicyComplianceService,
    PolicyEnforcementService,
    PolicyEvaluationService
  ]
})
export class PolicyModule {}