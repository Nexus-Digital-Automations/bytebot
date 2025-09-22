/**
 * Audit Guard
 *
 * Comprehensive audit guard that exports the AuditGuard from the permission-based-guards module
 * to maintain compatibility with existing audit infrastructure.
 */

// Re-export AuditGuard from permission-based-guards for compatibility
export { AuditGuard } from "./permission-based-guards";

// Re-export all audit-related interfaces and configurations
export {
  AuditGuardConfig,
  RequireAudit,
  AUDIT_GUARD_KEY,
} from "./permission-based-guards";
