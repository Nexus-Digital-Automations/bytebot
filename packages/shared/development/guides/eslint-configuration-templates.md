# ESLint Configuration Templates for Enum Preservation

## Quick Reference Templates

This file provides copy-paste templates for common ESLint configuration scenarios in the Bytebot shared package.

## File Header Templates

### 1. Comprehensive Security Enum File

```typescript
/**
 * [MODULE_NAME] Types - Bytebot Platform Security Framework
 *
 * This module defines comprehensive [DOMAIN] types for [PURPOSE]
 * across all Bytebot microservices and enterprise deployments.
 *
 * ARCHITECTURAL PRESERVATION RATIONALE:
 * Many enum values are intentionally unused by current implementation as they represent
 * a complete API surface for enterprise security requirements. These values support:
 *
 * - SIEM Integration: Complete event coverage for security monitoring systems
 * - Compliance Frameworks: Full support for SOC 2, GDPR, ISO 27001, HIPAA, etc.
 * - Enterprise Features: Advanced security capabilities for enterprise deployments
 * - Future Expansion: Platform growth without breaking API changes
 *
 * ESLint Configuration: Unused-vars warnings disabled for architectural completeness.
 * This is an intentional design decision prioritizing security completeness over
 * code minimalism.
 *
 * @fileoverview [Brief description]
 * @version [Version]
 * @author [Team]
 * @created [Date]
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */

// All comprehensive enums go here with full suppression

/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */

// Implementation interfaces and functions remain with full ESLint enforcement
```

### 2. Mixed Strategy File (Selective Suppression)

```typescript
/**
 * [MODULE_NAME] - Mixed ESLint Strategy
 *
 * ESLint Strategy: Selective suppression for comprehensive frameworks
 * while maintaining strict validation for implementation code.
 *
 * SUPPRESSED: Comprehensive enum definitions (architectural preservation)
 * ENFORCED: Implementation interfaces, functions, and business logic
 */

// Comprehensive enums (suppressed)
/* eslint-disable @typescript-eslint/no-unused-vars */
export enum ComprehensiveEnum {
  // All values including architectural preservation ones
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// Implementation code (strict enforcement)
export interface ImplementationInterface {
  // Full ESLint rules apply here
}
```

## ESLint Config Templates

### 1. Complete Project Configuration

```javascript
// eslint.config.mjs
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  // Base configuration
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  
  // === ARCHITECTURAL PRESERVATION CONFIGURATION ===
  // Files with comprehensive enum coverage (full suppression)
  {
    files: [
      "src/types/security.types.ts",
      "src/audit/types/audit-event.types.ts",
      "src/types/rbac.types.ts",
      "src/config/environment-security.config.ts"
    ],
    rules: {
      // Complete suppression for architectural enums
      "@typescript-eslint/no-unused-vars": "off",
      "no-unused-vars": "off",
      
      // Maintain type safety for interfaces
      "@typescript-eslint/no-explicit-any": ["error", {
        "ignoreRestArgs": true,
        "fixToUnknown": false
      }],
      
      // Allow comprehensive interface definitions
      "@typescript-eslint/no-empty-interface": "off",
      
      // Require documentation
      "require-jsdoc": "warn"
    }
  },
  
  // === STRICT IMPLEMENTATION ENFORCEMENT ===
  // Implementation files (full enforcement)
  {
    files: [
      "src/services/**/*.ts",
      "src/middleware/**/*.ts",
      "src/guards/**/*.ts",
      "src/decorators/**/*.ts",
      "src/pipes/**/*.ts",
      "src/interceptors/**/*.ts"
    ],
    rules: {
      // Strict enforcement for implementation
      "@typescript-eslint/no-unused-vars": "error",
      "no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error"
    }
  },
  
  // === TEST FILES CONFIGURATION ===
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^(mock|stub|fixture|test)"
      }],
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);
```

### 2. Package-Specific Override

```javascript
// .eslintrc.js (for package-specific overrides)
module.exports = {
  extends: ['../../eslint.config.mjs'],
  
  overrides: [
    // Shared package comprehensive types
    {
      files: ['src/types/**/*.types.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'no-unused-vars': 'off'
      }
    }
  ]
};
```

## Inline Comment Templates

### 1. Individual Enum Value Comments

```typescript
export enum SecurityLevel {
  LOW = "low",
  MEDIUM = "medium", 
  HIGH = "high",
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MAXIMUM = "maximum", // Enterprise: High-security deployments with advanced threat detection
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars  
  CUSTOM = "custom",   // Enterprise: Customer-defined security policies for contract compliance
}
```

### 2. Interface Field Comments

```typescript
export interface AuditEvent {
  id: string;
  timestamp: Date;
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gdprLawfulBasis?: string;        // GDPR: Article 6 legal basis documentation
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  complianceMetadata?: Record<string, unknown>; // Multi-framework compliance data
}
```

### 3. Block Comment for Enum Sections

```typescript
export enum SecurityEventType {
  // Currently implemented events
  LOGIN_FAILED = "auth.login.failed",
  ACCESS_DENIED = "access_denied",
  
  /* eslint-disable @typescript-eslint/no-unused-vars */
  // OWASP Top 10 Coverage (architectural preservation)
  INJECTION_ATTEMPT = "injection_attempt",           // A03: Injection attacks
  INSECURE_DESIGN_DETECTED = "insecure_design",     // A04: Insecure Design
  SECURITY_MISCONFIGURATION = "security_misconfig", // A05: Security Misconfiguration
  VULNERABLE_COMPONENT = "vulnerable_component",    // A06: Vulnerable Components
  /* eslint-enable @typescript-eslint/no-unused-vars */
}
```

## Specific File Pattern Templates

### 1. audit-event.types.ts Pattern

```typescript
/**
 * Audit Event Types - Comprehensive Enterprise Audit Framework
 *
 * Provides complete audit event coverage for enterprise security monitoring,
 * compliance reporting, and SIEM integration.
 *
 * ARCHITECTURAL PRESERVATION: All enum values represent essential audit
 * capabilities required for enterprise deployments and regulatory compliance.
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */

export enum AuditSeverity {
  DEBUG = "debug",
  INFO = "info", 
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
  FATAL = "fatal",
}

export enum SecurityEventCategory {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  DATA_ACCESS = "data_access", 
  DATA_MODIFICATION = "data_modification",
  SYSTEM = "system",
  SECURITY = "security",
  COMPLIANCE = "compliance",
  PERFORMANCE = "performance",
  NETWORK = "network",
  ERROR = "error",
  USER_ACTIVITY = "user_activity",
  API_ACCESS = "api_access",
}

export enum ComplianceFramework {
  GDPR = "gdpr",
  SOX = "sox",
  HIPAA = "hipaa", 
  PCI_DSS = "pci_dss",
  ISO_27001 = "iso_27001",
  NIST_CSF = "nist_csf",
  CSA = "csa",
}

/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */

// Implementation interfaces with full ESLint enforcement
export interface AuditEvent {
  id: string;
  timestamp: Date;
  severity: AuditSeverity;
  category: SecurityEventCategory;
  // ... rest with strict typing
}
```

### 2. security.types.ts Pattern

```typescript
/**
 * Security Types - Enterprise Security Framework
 *
 * Mixed ESLint Strategy: Comprehensive enum coverage with strict implementation validation
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
export enum SecurityEventType {
  // Authentication events (active)
  AUTHENTICATION_FAILED = "authentication_failed",
  LOGIN_SUCCESS = "auth.login.success",
  
  // Enterprise security events (architectural preservation)
  CSP_VIOLATION = "csp_violation",
  PERMISSION_ESCALATION_ATTEMPT = "authz.escalation.attempt", 
  THREAT_INTELLIGENCE_ALERT = "threat.intelligence.alert",
  
  // ... complete coverage
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// Strict enforcement for implementation
export interface SecurityEvent {
  eventId: string;
  type: SecurityEventType;
  // ... strict typing enforced
}
```

## Test Configuration Templates

### 1. Enum Coverage Test

```typescript
// enum-coverage.test.ts
import { SecurityEventType, ComplianceFramework } from '../types/security.types';

describe('Enum Coverage Validation', () => {
  test('All SecurityEventType values are accessible', () => {
    const allValues = Object.values(SecurityEventType);
    
    // Test comprehensive coverage including "unused" values
    expect(allValues).toContain('csp_violation');
    expect(allValues).toContain('permission_escalation_attempt');
    
    // Verify all values are defined
    allValues.forEach(value => {
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
    });
  });
});
```

### 2. ESLint Configuration Test

```typescript
// eslint-config.test.ts
describe('ESLint Configuration Validation', () => {
  test('Type files have proper unused-vars suppression', async () => {
    const eslint = new ESLint();
    
    const typeFiles = [
      'src/types/security.types.ts',
      'src/audit/types/audit-event.types.ts'
    ];
    
    for (const file of typeFiles) {
      const results = await eslint.lintFiles([file]);
      const unusedVarErrors = results[0].messages.filter(
        m => m.ruleId === '@typescript-eslint/no-unused-vars'
      );
      
      expect(unusedVarErrors).toHaveLength(0);
    }
  });
});
```

## Quick Copy-Paste Snippets

### File Header for New Type File

```typescript
/**
 * [FILENAME] - Bytebot Platform [DOMAIN] Framework
 *
 * Comprehensive [DOMAIN] type definitions supporting enterprise requirements.
 *
 * ARCHITECTURAL PRESERVATION: Many enum values are intentionally unused 
 * by current implementation to provide complete API coverage for:
 * - Enterprise security frameworks
 * - Compliance requirements (SOC 2, GDPR, etc.)
 * - SIEM integration compatibility
 * - Future platform expansion
 *
 * ESLint Configuration: Unused-vars disabled for architectural completeness
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
```

### Block Disable for Enum Section

```typescript
/* eslint-disable @typescript-eslint/no-unused-vars */
// Comprehensive [PURPOSE] coverage (architectural preservation)
export enum ComprehensiveEnum {
  // ... all values including future/enterprise ones
}
/* eslint-enable @typescript-eslint/no-unused-vars */
```

### Individual Line Disable

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
FUTURE_VALUE = "future", // [PURPOSE]: [JUSTIFICATION]
```

### Interface Field Disable

```typescript
// eslint-disable-next-line @typescript-eslint/no-unused-vars
enterpriseField?: string; // Enterprise: [SPECIFIC_USE_CASE]
```

This template file provides ready-to-use configurations for maintaining the architectural preservation strategy while properly managing ESLint rules.