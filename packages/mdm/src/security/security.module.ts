/**
 * Security Management Module
 * Handles device security policies, remote wipe, encryption enforcement, and threat detection
 *
 * Agent 6: Security Management & Threat Protection System
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { SecurityPolicy } from './entities/security-policy.entity';
import { SecurityIncident } from './entities/security-incident.entity';
import { SecurityThreat } from './entities/security-threat.entity';
import { SecurityAudit } from './entities/security-audit.entity';
import { EncryptionStatus } from './entities/encryption-status.entity';
import { RemoteWipeRequest } from './entities/remote-wipe-request.entity';
import { SecurityCompliance } from './entities/security-compliance.entity';

// Controllers
import { SecurityController } from './controllers/security.controller';
import { SecurityPolicyController } from './controllers/security-policy.controller';
import { SecurityIncidentController } from './controllers/security-incident.controller';
import { SecurityAuditController } from './controllers/security-audit.controller';
import { RemoteWipeController } from './controllers/remote-wipe.controller';
import { ThreatDetectionController } from './controllers/threat-detection.controller';

// Services
import { SecurityService } from './services/security.service';
import { SecurityPolicyService } from './services/security-policy.service';
import { SecurityIncidentService } from './services/security-incident.service';
import { SecurityAuditService } from './services/security-audit.service';
import { RemoteWipeService } from './services/remote-wipe.service';
import { ThreatDetectionService } from './services/threat-detection.service';
import { EncryptionService } from './services/encryption.service';
import { SecurityMonitoringService } from './services/security-monitoring.service';
import { SecurityComplianceService } from './services/security-compliance.service';
import { SecurityAlertService } from './services/security-alert.service';

// Repositories
import { SecurityIncidentRepository } from './repositories/security-incident.repository';
import { SecurityAuditRepository } from './repositories/security-audit.repository';

// Guards and Interceptors
import { SecurityClearanceGuard } from './guards/security-clearance.guard';
import { ThreatDetectionGuard } from './guards/threat-detection.guard';
import { SecurityAuditInterceptor } from './interceptors/security-audit.interceptor';

// Event Handlers
import { SecurityEventHandler } from './handlers/security-event.handler';
import { ThreatEventHandler } from './handlers/threat-event.handler';
import { IncidentEventHandler } from './handlers/incident-event.handler';

/**
 * Security Management Module
 * Comprehensive device security enforcement and threat protection system
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      SecurityPolicy,
      SecurityIncident,
      SecurityThreat,
      SecurityAudit,
      EncryptionStatus,
      RemoteWipeRequest,
      SecurityCompliance
    ])
  ],
  controllers: [
    SecurityController,
    SecurityPolicyController,
    SecurityIncidentController,
    SecurityAuditController,
    RemoteWipeController,
    ThreatDetectionController
  ],
  providers: [
    // Core services
    SecurityService,
    SecurityPolicyService,
    SecurityIncidentService,
    SecurityAuditService,
    RemoteWipeService,
    ThreatDetectionService,
    EncryptionService,
    SecurityMonitoringService,
    SecurityComplianceService,
    SecurityAlertService,

    // Repositories
    SecurityIncidentRepository,
    SecurityAuditRepository,

    // Security enforcement
    SecurityClearanceGuard,
    ThreatDetectionGuard,
    SecurityAuditInterceptor,

    // Event handlers
    SecurityEventHandler,
    ThreatEventHandler,
    IncidentEventHandler
  ],
  exports: [
    SecurityService,
    SecurityPolicyService,
    RemoteWipeService,
    ThreatDetectionService,
    SecurityMonitoringService
  ]
})
export class SecurityModule {}