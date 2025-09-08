# ESLint Configuration Guide for Enum Preservation and Architectural Design Choices

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [ESLint Disable Comment Best Practices](#eslint-disable-comment-best-practices)
3. [Configuration for Security Framework Enums](#configuration-for-security-framework-enums)
4. [Guidelines: ESLint-Disable vs Code Fixes](#guidelines-eslint-disable-vs-code-fixes)
5. [Template Comments for Architectural Preservation](#template-comments-for-architectural-preservation)
6. [Specific Configurations for Type Files](#specific-configurations-for-type-files)
7. [ESLint Configuration Examples](#eslint-configuration-examples)
8. [Validation and Testing Guidelines](#validation-and-testing-guidelines)
9. [Team Standards and Code Review](#team-standards-and-code-review)

## Executive Summary

This guide documents the proper handling of ESLint configurations for intentionally preserved enum values and architectural design choices in the Bytebot shared package. The focus is on maintaining comprehensive security framework enums while properly managing ESLint warnings.

### Key Principles
- **Architectural Preservation Over Code Minimalism**: Comprehensive enum coverage is intentional
- **Documentation-Driven Suppression**: All ESLint disables must be thoroughly documented
- **Strategic Suppression**: Only disable ESLint rules when architecturally justified
- **Future-Proof Design**: Maintain enum completeness for enterprise requirements

## ESLint Disable Comment Best Practices

### 1. File-Level Disables for Comprehensive Enums

**Use Case**: When entire enum definitions contain intentionally unused values for architectural completeness.

```typescript
/**
 * Security Event Types - Comprehensive Enterprise Coverage
 * 
 * This enum provides complete industry-standard security event coverage for:
 * - SIEM integration and security monitoring
 * - Compliance framework requirements (SOC 2, GDPR, ISO 27001)
 * - Enterprise audit trail completeness
 * - Future-proof security feature expansion
 * 
 * NOTE: Many enum values are intentionally "unused" by current implementation
 * but represent essential API surface for enterprise security requirements.
 * ESLint warnings are disabled for architectural design preservation.
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */

export enum SecurityEventType {
  // Authentication events (actively used)
  AUTHENTICATION_FAILED = "authentication_failed",
  LOGIN_SUCCESS = "auth.login.success",
  LOGIN_FAILED = "auth.login.failed",
  
  // Future security monitoring events (architectural preservation)
  CSP_VIOLATION = "csp_violation",
  PERMISSION_ESCALATION_ATTEMPT = "authz.escalation.attempt",
  THREAT_INTELLIGENCE_ALERT = "threat.intelligence.alert",
  
  // SIEM integration events (compliance requirement)
  AUDIT_LOG_TAMPERING = "audit.log.tampering",
  PRIVILEGE_ABUSE_DETECTED = "privilege.abuse.detected",
}

/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */
```

### 2. Enum-Specific Inline Disables

**Use Case**: When specific enum values within a file need suppression while maintaining linting for other code.

```typescript
export enum AuditSeverity {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRITICAL = "critical",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  FATAL = "fatal", // Reserved for future catastrophic system failures
}
```

### 3. Interface-Level Disables for Complete API Coverage

```typescript
/**
 * Comprehensive compliance framework interface
 * Supports current and future regulatory requirements
 */

/* eslint-disable @typescript-eslint/no-unused-vars */

export interface ComplianceInfo {
  frameworks: ComplianceFramework[];
  dataClassification?: string;
  retentionPeriod?: number;
  
  // Future compliance fields (architectural preservation)
  gdprLawfulBasis?: string;
  hipaaSecurityRule?: boolean;
  pcidssScope?: string;
  iso27001Controls?: string[];
}

/* eslint-enable @typescript-eslint/no-unused-vars */
```

## Configuration for Security Framework Enums

### 1. TypeScript ESLint Configuration for Security Types

**File**: `eslint.config.mjs`

```javascript
export default tseslint.config(
  // ... existing config
  {
    // Specific configuration for security framework files
    files: [
      "src/types/security.types.ts",
      "src/audit/types/audit-event.types.ts",
      "src/types/rbac.types.ts"
    ],
    rules: {
      // Allow unused vars in comprehensive enum definitions
      "@typescript-eslint/no-unused-vars": ["error", {
        "varsIgnorePattern": "^(SecurityEventType|ComplianceFramework|AuditSeverity|SecurityEventCategory)$",
        "argsIgnorePattern": "^_",
        "ignoreRestSiblings": true
      }],
      
      // Relax no-unused-vars for architectural enums
      "no-unused-vars": ["error", {
        "varsIgnorePattern": "^(SECURITY_|AUDIT_|COMPLIANCE_|RBAC_)",
        "argsIgnorePattern": "^_"
      }]
    }
  },
  
  // Configuration for comprehensive type definition files
  {
    files: ["src/types/**/*.types.ts"],
    rules: {
      // Allow comprehensive interface definitions
      "@typescript-eslint/no-empty-interface": "off",
      
      // Allow any type in metadata fields (security context flexibility)
      "@typescript-eslint/no-explicit-any": ["error", {
        "ignoreRestArgs": true,
        "fixToUnknown": false
      }]
    }
  }
);
```

### 2. Custom ESLint Rule Patterns

```javascript
// Pattern-based ignoring for security framework enums
const SECURITY_FRAMEWORK_PATTERNS = [
  // Security event types
  /^(AUTHENTICATION_|AUTHORIZATION_|SECURITY_|AUDIT_)/,
  
  // Compliance framework types
  /^(GDPR_|SOX_|HIPAA_|PCI_DSS_|ISO_27001_|NIST_)/,
  
  // Future-proofed security categories
  /^(THREAT_|INCIDENT_|COMPLIANCE_|MONITORING_)/
];

// ESLint config rule application
rules: {
  "@typescript-eslint/no-unused-vars": ["error", {
    varsIgnorePattern: SECURITY_FRAMEWORK_PATTERNS.map(p => p.source).join("|")
  }]
}
```

### 3. Environment-Specific ESLint Configuration

```javascript
// Development environment - strict linting
{
  env: { NODE_ENV: "development" },
  rules: {
    "@typescript-eslint/no-unused-vars": "error",
    // Full enforcement in development
  }
},

// Production build - architectural preservation
{
  env: { NODE_ENV: "production" },
  files: ["src/types/**/*.types.ts"],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", {
      // Allow architectural enums in production builds
      "varsIgnorePattern": "^(Security|Audit|Compliance|RBAC)"
    }]
  }
}
```

## Guidelines: ESLint-Disable vs Code Fixes

### Decision Matrix: When to Disable vs Fix

| Scenario | Action | Rationale | Example |
|----------|--------|-----------|---------|
| **Unused import from external library** | **Fix** (remove import) | No architectural value | `import { unused } from 'library'` |
| **Unused local variable in function** | **Fix** (remove variable) | Code cleanup opportunity | `const temp = process();` |
| **Comprehensive security enum value** | **Disable ESLint** | Architectural preservation | `CSP_VIOLATION = "csp_violation"` |
| **Future compliance framework** | **Disable ESLint** | Enterprise readiness | `ISO_27001 = "iso_27001"` |
| **SIEM integration event type** | **Disable ESLint** | Third-party tool compatibility | `THREAT_DETECTED = "threat_detected"` |
| **Debugging/development code** | **Fix** (remove code) | Production readiness | `console.log('debug')` |
| **Complete API interface field** | **Disable ESLint** | API completeness | `optional_enterprise_field?: string` |

### Decision Flowchart

```
Is the "unused" code part of a comprehensive framework?
├─ YES: Is it documented as architectural preservation?
│   ├─ YES: DISABLE ESLint with documentation
│   └─ NO: Add documentation, then DISABLE
└─ NO: Is it needed for future/enterprise features?
    ├─ YES: Document rationale, then DISABLE
    └─ NO: FIX by removing the code
```

### Code Examples: Disable vs Fix

#### ✅ CORRECT: Disable for Architectural Preservation

```typescript
/**
 * Complete OWASP security event coverage
 * Required for enterprise SIEM integration and compliance reporting
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
export enum SecurityEventType {
  // Currently used events
  LOGIN_FAILED = "auth.login.failed",
  ACCESS_DENIED = "access_denied",
  
  // OWASP Top 10 coverage (architectural requirement)
  INJECTION_ATTEMPT = "injection_attempt",           // A03: Injection
  INSECURE_DESIGN_DETECTED = "insecure_design",     // A04: Insecure Design
  SECURITY_MISCONFIGURATION = "security_misconfig", // A05: Security Misconfiguration
  
  // SOC 2 compliance events (regulatory requirement)  
  DATA_INTEGRITY_VIOLATION = "data_integrity_violation",
  PROCESSING_INTEGRITY_FAILURE = "processing_integrity_failure",
}
/* eslint-enable @typescript-eslint/no-unused-vars */
```

#### ❌ INCORRECT: Should Fix Instead of Disable

```typescript
// BAD: Disabling ESLint for genuinely unused code
/* eslint-disable @typescript-eslint/no-unused-vars */
export enum BadExample {
  USED_VALUE = "used",
  TYPO_VALUE = "typoo",     // This should be fixed, not disabled
  OLD_DEPRECATED = "old",   // This should be removed, not disabled
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// GOOD: Fix the actual issues
export enum GoodExample {
  USED_VALUE = "used",
  // Removed typo and deprecated values
}
```

## Template Comments for Architectural Preservation

### 1. File Header Template for Comprehensive Enums

```typescript
/**
 * [MODULE_NAME] - Bytebot Platform Security Framework
 *
 * This module defines comprehensive [DOMAIN] types for [PRIMARY_USE_CASES]
 * across all Bytebot microservices.
 *
 * NOTE: Many enum values are intentionally unused as they represent a complete
 * API surface for enterprise [DOMAIN] requirements. ESLint warnings are disabled
 * for comprehensive enum definitions that provide full industry-standard coverage.
 *
 * ARCHITECTURAL RATIONALE:
 * - [PRIMARY_REASON]: [Detailed explanation]
 * - [SECONDARY_REASON]: [Detailed explanation]
 * - [COMPLIANCE_REASON]: [Regulatory/compliance requirements]
 *
 * ENTERPRISE REQUIREMENTS:
 * - SIEM Integration: [Third-party tool compatibility requirements]
 * - Compliance Frameworks: [List of supported frameworks]
 * - Future Expansion: [Planned features requiring these enums]
 *
 * @fileoverview [Brief description of purpose]
 * @version [Version number]
 * @author [Team name]
 * @created [Date]
 * @lastmodified [Date]
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */
```

### 2. Enum-Specific Comment Template

```typescript
/**
 * [ENUM_NAME] - [Purpose and scope]
 * 
 * Provides comprehensive coverage for:
 * - [PRIMARY_USE_CASE]: [Description]
 * - [SECONDARY_USE_CASE]: [Description]
 * - [COMPLIANCE_USE_CASE]: [Regulatory requirement]
 *
 * ARCHITECTURAL PRESERVATION RATIONALE:
 * - Enterprise Readiness: [How this supports enterprise deployments]
 * - Compliance Requirements: [Which frameworks require these values]
 * - Third-party Integration: [Which tools expect these values]
 * - Future-proofing: [Planned features that will use these values]
 *
 * ESLint Configuration: Unused-vars disabled for architectural completeness
 */
export enum EnumName {
  // [CATEGORY 1]: Currently implemented values
  ACTIVE_VALUE_1 = "active_1",
  ACTIVE_VALUE_2 = "active_2",
  
  // [CATEGORY 2]: Enterprise/future implementation (architectural preservation)
  ENTERPRISE_VALUE_1 = "enterprise_1", // Required for [SPECIFIC_REQUIREMENT]
  ENTERPRISE_VALUE_2 = "enterprise_2", // Required for [SPECIFIC_REQUIREMENT]
  
  // [CATEGORY 3]: Compliance framework requirements
  COMPLIANCE_VALUE_1 = "compliance_1", // Required for [FRAMEWORK_NAME]
  COMPLIANCE_VALUE_2 = "compliance_2", // Required for [FRAMEWORK_NAME]
}
```

### 3. Interface Field Comment Template

```typescript
export interface ComprehensiveInterface {
  // Core fields (actively used)
  id: string;
  timestamp: Date;
  
  /**
   * Enterprise audit fields (architectural preservation)
   * 
   * These fields support comprehensive audit requirements for:
   * - SOC 2 Type II compliance reporting
   * - GDPR data processing documentation
   * - SIEM integration and security monitoring
   * 
   * While not actively used in current implementation, they provide
   * essential API surface for enterprise deployments and regulatory compliance.
   */
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gdprLawfulBasis?: string;        // GDPR Article 6 legal basis documentation
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  retentionPolicyId?: string;      // Data retention policy identifier
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  complianceMetadata?: Record<string, unknown>; // Framework-specific metadata
}
```

### 4. Inline Comment Template for Individual Values

```typescript
export enum SecurityLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  MAXIMUM = "maximum", // Reserved for high-security enterprise deployments with advanced threat detection
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CUSTOM = "custom",   // Enables customer-defined security policies for enterprise contracts
}
```

## Specific Configurations for Type Files

### 1. audit-event.types.ts Configuration

**File-specific ESLint rules**:

```javascript
// eslint.config.mjs
{
  files: ["src/audit/types/audit-event.types.ts"],
  rules: {
    // Allow comprehensive audit event enums
    "@typescript-eslint/no-unused-vars": "off",
    "no-unused-vars": "off",
    
    // Maintain strict type checking for interfaces
    "@typescript-eslint/no-explicit-any": ["error", {
      "ignoreRestArgs": true,
      // Allow any in metadata fields for audit flexibility
      "fixToUnknown": false
    }],
    
    // Allow complex interfaces for audit completeness
    "@typescript-eslint/no-empty-interface": "off",
    
    // Require documentation for all public types
    "@typescript-eslint/explicit-module-boundary-types": "error"
  }
}
```

**File structure with ESLint configuration**:

```typescript
/**
 * Audit Event Types - Comprehensive Enterprise Audit Framework
 * 
 * ESLint Configuration: Complete suppression of unused-vars for architectural preservation
 * Rationale: Provides complete SIEM integration and compliance framework coverage
 */

/* eslint-disable @typescript-eslint/no-unused-vars, no-unused-vars */

// All enum definitions with comprehensive coverage
export enum AuditSeverity { /* ... */ }
export enum SecurityEventCategory { /* ... */ }
export enum ComplianceFramework { /* ... */ }

/* eslint-enable @typescript-eslint/no-unused-vars, no-unused-vars */

// Interfaces can remain with normal ESLint rules
export interface AuditEvent {
  // Standard interface linting applies here
}
```

### 2. security.types.ts Configuration

```typescript
/**
 * Security Types - Enterprise Security Framework
 * 
 * ESLint Strategy: Selective suppression for comprehensive security enums
 * while maintaining strict validation for implementation interfaces
 */

// Comprehensive security enums (suppressed)
/* eslint-disable @typescript-eslint/no-unused-vars */
export enum SecurityEventType { /* comprehensive coverage */ }
export enum RateLimitServiceType { /* complete service mapping */ }
/* eslint-enable @typescript-eslint/no-unused-vars */

// Implementation interfaces (strict linting)
export interface SecurityEvent {
  eventId: string; // Strict type checking maintained
  type: SecurityEventType; // Uses comprehensive enum above
  // ... rest with full ESLint enforcement
}

// Utility functions (strict linting)
export function createSecurityEvent(/* parameters */): SecurityEvent {
  // Full ESLint rule enforcement for implementation code
}
```

### 3. rbac.types.ts Configuration Pattern

```typescript
/**
 * RBAC Types - Role-Based Access Control Framework
 * 
 * Mixed ESLint Strategy:
 * - Comprehensive enum coverage (suppressed)
 * - Strict interface validation (enforced)
 * - Implementation code validation (enforced)
 */

/* eslint-disable @typescript-eslint/no-unused-vars */
export enum UserRole {
  ADMIN = "admin",
  OPERATOR = "operator", 
  VIEWER = "viewer",
  
  // Enterprise roles (architectural preservation)
  AUDITOR = "auditor",           // Required for SOC 2 compliance
  SECURITY_OFFICER = "security", // Required for enterprise security management
  COMPLIANCE_MANAGER = "compliance", // Required for regulatory reporting
}

export enum Permission {
  // Comprehensive permission coverage for enterprise RBAC
  // ... all permissions including future/enterprise ones
}
/* eslint-enable @typescript-eslint/no-unused-vars */

// Strict validation for role metadata interfaces
export interface RoleMetadata {
  roles: UserRole[];        // Uses comprehensive enum
  requireAll: boolean;      // Full type checking
}
```

## ESLint Configuration Examples

### 1. Complete Project Configuration

**File**: `eslint.config.mjs`

```javascript
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  // Base configuration
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  
  // Global configuration
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  
  // Comprehensive enum type files (architectural preservation)
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
      "@typescript-eslint/no-empty-interface": "off"
    }
  },
  
  // Implementation files (strict enforcement)
  {
    files: [
      "src/services/**/*.ts",
      "src/middleware/**/*.ts", 
      "src/guards/**/*.ts",
      "src/decorators/**/*.ts"
    ],
    rules: {
      // Full ESLint enforcement for implementation
      "@typescript-eslint/no-unused-vars": "error",
      "no-unused-vars": "error",
      "@typescript-eslint/no-explicit-any": "error",
      
      // Strict type checking for implementation
      "@typescript-eslint/explicit-function-return-type": "error",
      "@typescript-eslint/no-unsafe-assignment": "error"
    }
  },
  
  // Test files (balanced approach)
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    rules: {
      // Allow test utilities and mocks
      "@typescript-eslint/no-unused-vars": ["error", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^(mock|stub|fixture)"
      }],
      
      // Allow any for test data flexibility
      "@typescript-eslint/no-explicit-any": "warn"
    }
  }
);
```

### 2. Package-Level ESLint Configuration

**File**: `.eslintrc.js` (for package-specific overrides)

```javascript
module.exports = {
  extends: ['../../eslint.config.mjs'],
  
  // Package-specific overrides
  overrides: [
    // Shared package comprehensive types
    {
      files: ['src/types/**/*.types.ts'],
      rules: {
        '@typescript-eslint/no-unused-vars': 'off',
        'no-unused-vars': 'off'
      }
    },
    
    // Audit framework files
    {
      files: ['src/audit/**/*.ts'],
      rules: {
        // Allow comprehensive audit coverage
        '@typescript-eslint/no-unused-vars': ['error', {
          varsIgnorePattern: '^(Audit|Security|Compliance)'
        }]
      }
    }
  ],
  
  // Project-specific environment
  env: {
    node: true,
    jest: true
  },
  
  // Custom rule definitions
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json'
      }
    }
  }
};
```

### 3. Workspace-Level Configuration

**File**: Root workspace `eslint.config.mjs`

```javascript
export default tseslint.config(
  // Workspace-wide base rules
  {
    files: ['packages/*/src/**/*.ts'],
    rules: {
      // Standard enforcement
      '@typescript-eslint/no-unused-vars': 'error',
      'no-unused-vars': 'error'
    }
  },
  
  // Shared package architectural preservation
  {
    files: ['packages/shared/src/types/**/*.types.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off'
    }
  },
  
  // Service implementation files (strict)
  {
    files: [
      'packages/bytebotd/src/**/*.ts',
      'packages/bytebot-agent/src/**/*.ts'
    ],
    rules: {
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error'
    }
  }
);
```

## Validation and Testing Guidelines

### 1. ESLint Configuration Testing

**Test ESLint configuration effectiveness**:

```bash
# Test comprehensive enum files (should pass with warnings suppressed)
npx eslint src/types/security.types.ts --no-ignore

# Test implementation files (should enforce strict rules)
npx eslint src/services/**/*.ts --no-ignore

# Test configuration inheritance
npx eslint src/audit/types/audit-event.types.ts --print-config
```

### 2. Comprehensive Enum Validation

**Validate all enum values are accessible**:

```typescript
// enum-validation.test.ts
import { SecurityEventType, ComplianceFramework } from '../types/security.types';

describe('Comprehensive Enum Coverage', () => {
  test('All SecurityEventType values are accessible', () => {
    const allValues = Object.values(SecurityEventType);
    
    // Verify comprehensive coverage
    expect(allValues).toContain('csp_violation');
    expect(allValues).toContain('permission_escalation_attempt');
    expect(allValues).toContain('threat_intelligence_alert');
    
    // Verify no undefined values
    allValues.forEach(value => {
      expect(value).toBeDefined();
      expect(typeof value).toBe('string');
    });
  });
  
  test('All ComplianceFramework values map to valid strings', () => {
    const frameworks = Object.values(ComplianceFramework);
    
    frameworks.forEach(framework => {
      expect(framework).toMatch(/^[a-z_]+$/); // Valid identifier format
      expect(framework.length).toBeGreaterThan(2);
    });
  });
});
```

### 3. ESLint Rule Coverage Testing

```typescript
// eslint-coverage.test.ts
describe('ESLint Configuration Coverage', () => {
  test('Type files have unused-vars suppression', async () => {
    const eslint = new ESLint();
    
    // These files should not report unused-vars errors
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
  
  test('Implementation files enforce strict rules', async () => {
    const eslint = new ESLint();
    
    // Create test file with unused variable
    const testContent = `
      export function testFunction() {
        const unusedVar = 'should trigger error';
        return 'test';
      }
    `;
    
    // This should trigger unused-vars error in implementation files
    const results = await eslint.lintText(testContent, {
      filePath: 'src/services/test.service.ts'
    });
    
    const unusedVarErrors = results[0].messages.filter(
      m => m.ruleId === '@typescript-eslint/no-unused-vars'
    );
    
    expect(unusedVarErrors.length).toBeGreaterThan(0);
  });
});
```

### 4. Documentation Validation

```typescript
// documentation-validation.test.ts
describe('Enum Documentation Requirements', () => {
  test('All comprehensive enum files have architectural rationale', () => {
    const typeFiles = [
      'src/types/security.types.ts',
      'src/audit/types/audit-event.types.ts'
    ];
    
    typeFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for required documentation elements
      expect(content).toContain('architectural preservation');
      expect(content).toContain('enterprise requirements');
      expect(content).toContain('eslint-disable');
      expect(content).toContain('comprehensive coverage');
    });
  });
});
```

## Team Standards and Code Review

### 1. Code Review Checklist

**For files with ESLint suppressions**:

- [ ] **Documentation Present**: Architectural rationale clearly documented
- [ ] **Suppression Scope**: ESLint disable is minimal and targeted
- [ ] **Business Justification**: Clear enterprise/compliance requirement
- [ ] **Alternative Considered**: Confirm code fix isn't more appropriate
- [ ] **Future Usage**: Documented plan for utilizing "unused" values
- [ ] **Test Coverage**: Enum values are tested for accessibility
- [ ] **Integration Impact**: SIEM/compliance tool compatibility verified

**For implementation files**:

- [ ] **No Suppressions**: Implementation code doesn't suppress unused-vars
- [ ] **Clean Imports**: All imports are actually used
- [ ] **Variable Usage**: All variables serve a purpose
- [ ] **Function Parameters**: All parameters are utilized

### 2. Pull Request Templates

**Template for enum changes**:

```markdown
## Enum Modification Checklist

- [ ] Added architectural documentation for new enum values
- [ ] Verified ESLint suppression is appropriate
- [ ] Updated compliance framework mapping if applicable
- [ ] Added test coverage for new enum values
- [ ] Verified SIEM integration compatibility
- [ ] Documented enterprise use cases

## Architectural Impact
Describe how these enum changes support:
1. Enterprise requirements: [Details]
2. Compliance frameworks: [Which frameworks benefit]
3. Future feature expansion: [Planned usage]

## ESLint Configuration
- [ ] File-level suppression documented with rationale
- [ ] Alternative approaches considered and rejected
- [ ] No impact on implementation file linting strictness
```

### 3. Team Guidelines

**When adding new enum values**:

1. **Document First**: Add comprehensive documentation before the enum
2. **Justify Suppression**: Clearly explain why ESLint suppression is needed
3. **Test Coverage**: Ensure all enum values are covered by tests
4. **Review Impact**: Consider impact on SIEM and compliance integrations

**When removing ESLint suppressions**:

1. **Verify Usage**: Confirm enum values are genuinely unused
2. **Check Dependencies**: Verify no external systems expect these values
3. **Update Documentation**: Remove or update architectural rationale
4. **Compliance Review**: Ensure removal doesn't impact compliance requirements

**Code review responsibilities**:

- **Author**: Provide clear justification for any ESLint suppressions
- **Reviewer**: Challenge suppressions that lack clear architectural rationale
- **Team Lead**: Ensure consistency with architectural preservation strategy
- **Security Lead**: Verify compliance and security framework completeness

### 4. Continuous Integration

**ESLint CI Configuration**:

```yaml
# .github/workflows/lint.yml
name: ESLint Validation

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Lint Implementation Files (Strict)
        run: npx eslint 'src/services/**/*.ts' 'src/middleware/**/*.ts'
        
      - name: Lint Type Files (Architectural Preservation)
        run: npx eslint 'src/types/**/*.ts' --max-warnings 0
        
      - name: Validate Enum Coverage
        run: npm run test:enum-coverage
        
      - name: Check Documentation Requirements
        run: npm run test:documentation-validation
```

**Quality gates**:

- Implementation files must pass strict ESLint with zero warnings
- Type files may have suppressed unused-vars but must pass other rules
- All enum values must be tested for accessibility
- Documentation requirements must be met for architectural suppressions

This comprehensive guide ensures that ESLint configurations properly support the architectural decision to preserve comprehensive enum coverage while maintaining code quality standards for implementation files.