/**
 * ============================================================================
 * MODULE: Institutional Audit Trail Logger (audit.middleware.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Writes immutable, non-repudiable audit logs to the SQLite `audit_logs` table
 * for institutional compliance, accreditation tracking, and security monitoring.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Generates a unique UUID `log_id` for every recorded action.
 * 2. Captures actor user ID (or null for unauthenticated/system actions).
 * 3. Records action verbs (e.g. USER_LOGIN, DOCUMENT_UPLOAD, WORKFLOW_APPROVE,
 *    NOTIFICATION_DISPATCHED, ADMIN_USER_UPDATE, etc.).
 * 4. Stores target resource types (USER, DOCUMENT, WORKFLOW, NOTIFICATION, etc.)
 *    and unique resource identifiers.
 * 5. Records client IP address, User-Agent browser fingerprint, and JSON metadata.
 * 6. Executes non-blocking inserts with error containment to prevent audit
 *    failures from terminating primary business requests.
 * ============================================================================
 */

import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { logger } from '../utils/logger';

/**
 * Records an immutable audit trail entry in the database.
 * 
 * @param {any} userId - ID of the user performing the action.
 * @param {string} action - Action identifier code.
 * @param {string} resourceType - Type of resource affected.
 * @param {any} [resourceId] - Specific ID of the resource.
 * @param {any} [ipAddress] - Client IP address.
 * @param {any} [userAgent] - Client HTTP user agent header.
 * @param {any} [metadata] - Additional JSON-serializable contextual metadata.
 */
export function recordAuditLog(
  userId: any,
  action: string,
  resourceType: string,
  resourceId?: any,
  ipAddress?: any,
  userAgent?: any,
  metadata?: any
): void {
  try {
    const db = getDatabase();
    const logId = uuidv4();
    const metaString = metadata ? JSON.stringify(metadata) : null;
    const userStr = userId ? String(userId) : null;
    const resIdStr = Array.isArray(resourceId) ? resourceId.join(',') : (resourceId ? String(resourceId) : null);
    const ipStr = Array.isArray(ipAddress) ? ipAddress.join(',') : (ipAddress ? String(ipAddress) : null);
    const uaStr = Array.isArray(userAgent) ? userAgent.join(' ') : (userAgent ? String(userAgent) : null);

    db.prepare(`
      INSERT INTO audit_logs (log_id, user_id, action, resource_type, resource_id, ip_address, user_agent, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(logId, userStr, action, resourceType, resIdStr, ipStr, uaStr, metaString);

    logger.debug(`[AUDIT] Action: ${action} | Resource: ${resourceType}:${resIdStr} | User: ${userStr}`);
  } catch (err: any) {
    logger.error('Failed to write audit log:', err.message);
  }
}
