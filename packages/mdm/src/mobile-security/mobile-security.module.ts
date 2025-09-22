/**
 * Mobile Security Module
 * Handles mobile app security scanning, vulnerability assessment, and threat analysis
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

// Entities
import { SecurityScan } from './entities/security-scan.entity';
import { Vulnerability } from './entities/vulnerability.entity';
import { ThreatAssessment } from './entities/threat-assessment.entity';
import { SecurityScore } from './entities/security-score.entity';

// Controllers
import { MobileSecurityController } from './controllers/mobile-security.controller';
import { VulnerabilityController } from './controllers/vulnerability.controller';

// Services
import { MobileSecurityService } from './services/mobile-security.service';
import { VulnerabilityService } from './services/vulnerability.service';
import { ThreatAnalysisService } from './services/threat-analysis.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SecurityScan,
      Vulnerability,
      ThreatAssessment,
      SecurityScore
    ])
  ],
  controllers: [
    MobileSecurityController,
    VulnerabilityController
  ],
  providers: [
    MobileSecurityService,
    VulnerabilityService,
    ThreatAnalysisService
  ],
  exports: [
    MobileSecurityService,
    VulnerabilityService,
    ThreatAnalysisService
  ]
})
export class MobileSecurityModule {}