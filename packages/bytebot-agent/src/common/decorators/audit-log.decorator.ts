/**
 * Audit Log Decorator
 *
 * Custom decorator for marking controller methods that require audit logging.
 * Automatically logs user actions, request/response data, and system events.
 */

import { SetMetadata } from '@nestjs/common';

export interface AuditLogConfig {
  action: string;
  resource: string;
  includeRequestBody?: boolean;
  includeResponseBody?: boolean;
  sensitiveFields?: string[];
  level?: 'low' | 'medium' | 'high' | 'critical';
}

export const AUDIT_LOG_METADATA = 'auditLog';

/**
 * Mark endpoint for audit logging
 */
export const AuditLog = (config: AuditLogConfig) =>
  SetMetadata(AUDIT_LOG_METADATA, {
    includeRequestBody: true,
    includeResponseBody: false,
    level: 'medium',
    ...config,
  });
