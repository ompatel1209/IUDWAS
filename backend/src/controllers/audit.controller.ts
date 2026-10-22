/**
 * ============================================================================
 * MODULE: Institutional Audit Trail Explorer Controller (audit.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Exposes immutable system audit trails, access logs, actor identity records,
 * client IP addresses, and JSON contextual metadata to Super Admins and
 * compliance auditors.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `getAuditLogs()`:
 *    - Paginated query engine supporting multi-parameter filtering across
 *      action verbs (USER_REGISTER, LOGIN_SUCCESS, DOCUMENT_UPLOAD, etc.),
 *      resource types (USER, DOCUMENT, WORKFLOW, etc.), actor user IDs, and
 *      fuzzy string search across user names and emails.
 *    - Safely parses stored JSON metadata into structured client response objects.
 * 2. `getAuditLogById()`:
 *    - Retrieves a single detailed audit log record with actor profile metadata.
 * ============================================================================
 */

import { Request, Response } from 'express';
import { getDatabase } from '../db/database';
import { sendSuccess, sendError } from '../utils/response';

export class AuditController {
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '15', 10);
      const offset = (page - 1) * limit;
      const action = (req.query.action as string || '').trim();
      const resourceType = (req.query.resource_type as string || '').trim();
      const userId = (req.query.user_id as string || '').trim();
      const search = (req.query.search as string || '').trim();

      const db = getDatabase();
      let whereClauses: string[] = ['1=1'];
      let params: any[] = [];

      if (action) {
        whereClauses.push('a.action = ?');
        params.push(action);
      }

      if (resourceType) {
        whereClauses.push('a.resource_type = ?');
        params.push(resourceType);
      }

      if (userId) {
        whereClauses.push('a.user_id = ?');
        params.push(userId);
      }

      if (search) {
        whereClauses.push('(a.action LIKE ? OR a.resource_type LIKE ? OR u.email LIKE ? OR u.full_name LIKE ?)');
        const term = `%${search}%`;
        params.push(term, term, term, term);
      }

      const whereSql = whereClauses.join(' AND ');

      const countRow = db.prepare(`
        SELECT COUNT(*) as total 
        FROM audit_logs a 
        LEFT JOIN users u ON a.user_id = u.user_id 
        WHERE ${whereSql}
      `).get(...params) as { total: number };

      const total = countRow.total;
      const totalPages = Math.ceil(total / limit);

      const logs = db.prepare(`
        SELECT a.*, u.full_name as user_name, u.email as user_email, u.role as user_role
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE ${whereSql}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as any[];

      const formatted = logs.map(l => {
        let parsedMeta = null;
        try {
          parsedMeta = l.metadata ? JSON.parse(l.metadata) : null;
        } catch {
          parsedMeta = l.metadata;
        }
        return {
          ...l,
          metadata: parsedMeta,
        };
      });

      sendSuccess(res, formatted, {
        page,
        limit,
        total,
        totalPages,
      });
    } catch (err: any) {
      sendError(res, 'AUDIT_LOGS_ERROR', err.message, 500);
    }
  }

  static async getAuditLogById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const log = db.prepare(`
        SELECT a.*, u.full_name as user_name, u.email as user_email, u.role as user_role
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.user_id
        WHERE a.log_id = ?
      `).get(id) as any;

      if (!log) {
        sendError(res, 'AUDIT_LOG_NOT_FOUND', 'Audit log entry not found', 404);
        return;
      }

      let parsedMeta = null;
      try {
        parsedMeta = log.metadata ? JSON.parse(log.metadata) : null;
      } catch {
        parsedMeta = log.metadata;
      }

      sendSuccess(res, {
        ...log,
        metadata: parsedMeta,
      });
    } catch (err: any) {
      sendError(res, 'AUDIT_GET_ERROR', err.message, 500);
    }
  }
}
