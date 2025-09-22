/**
 * Compliance Management Module
 * Handles compliance reporting, audit trails, and regulatory standards
 *
 * Agent 8: Compliance Reporting & Regulatory Management System
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { ComplianceReport } from './entities/compliance-report.entity';
import { ComplianceStandard } from './entities/compliance-standard.entity';
import { ComplianceAudit } from './entities/compliance-audit.entity';
import { ComplianceViolation } from './entities/compliance-violation.entity';
import { ComplianceRemediation } from './entities/compliance-remediation.entity';
import { AuditTrail } from './entities/audit-trail.entity';
import { RegulatoryFramework } from './entities/regulatory-framework.entity';

// Controllers
import { ComplianceController } from './controllers/compliance.controller';
import { ComplianceReportingController } from './controllers/compliance-reporting.controller';
import { ComplianceAuditController } from './controllers/compliance-audit.controller';
import { AuditTrailController } from './controllers/audit-trail.controller';
import { RegulatoryController } from './controllers/regulatory.controller';

// Services
import { ComplianceService } from './services/compliance.service';
import { ComplianceReportingService } from './services/compliance-reporting.service';
import { ComplianceAuditService } from './services/compliance-audit.service';
import { ComplianceMonitoringService } from './services/compliance-monitoring.service';
import { AuditTrailService } from './services/audit-trail.service';
import { RegulatoryComplianceService } from './services/regulatory-compliance.service';
import { ComplianceValidationService } from './services/compliance-validation.service';
import { ComplianceAlertService } from './services/compliance-alert.service';

// Repositories
import { ComplianceReportRepository } from './repositories/compliance-report.repository';
import { AuditTrailRepository } from './repositories/audit-trail.repository';

// Guards and Interceptors
import { ComplianceAccessGuard } from './guards/compliance-access.guard';
import { AuditTrailGuard } from './guards/audit-trail.guard';
import { ComplianceAuditInterceptor } from './interceptors/compliance-audit.interceptor';

// Event Handlers
import { ComplianceEventHandler } from './handlers/compliance-event.handler';
import { AuditEventHandler } from './handlers/audit-event.handler';
import { ViolationEventHandler } from './handlers/violation-event.handler';

/**
 * Compliance Management Module
 * Comprehensive compliance monitoring and regulatory management system
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ComplianceReport,
      ComplianceStandard,
      ComplianceAudit,
      ComplianceViolation,
      ComplianceRemediation,
      AuditTrail,
      RegulatoryFramework
    ])
  ],
  controllers: [
    ComplianceController,
    ComplianceReportingController,
    ComplianceAuditController,
    AuditTrailController,
    RegulatoryController
  ],
  providers: [
    // Core services
    ComplianceService,
    ComplianceReportingService,
    ComplianceAuditService,
    ComplianceMonitoringService,
    AuditTrailService,
    RegulatoryComplianceService,
    ComplianceValidationService,
    ComplianceAlertService,

    // Repositories
    ComplianceReportRepository,
    AuditTrailRepository,

    // Access control and auditing
    ComplianceAccessGuard,
    AuditTrailGuard,
    ComplianceAuditInterceptor,

    // Event handlers
    ComplianceEventHandler,
    AuditEventHandler,
    ViolationEventHandler
  ],
  exports: [
    ComplianceService,
    ComplianceReportingService,
    ComplianceAuditService,
    AuditTrailService,
    RegulatoryComplianceService
  ]
})
export class ComplianceModule {}