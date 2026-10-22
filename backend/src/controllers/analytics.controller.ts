/**
 * ============================================================================
 * MODULE: Institutional Analytics & KPI Telemetry Controller (analytics.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Computes institutional performance telemetry, workflow SLA turnaround velocities,
 * user role distributions, department activity distributions, and user-specific
 * workspace KPI summaries.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `getAdminMetrics()`:
 *    - Aggregates system-wide key metrics: total users, active accounts,
 *      vault documents, pending/approved/rejected requests, and active departments.
 *    - Breaks down user counts by role and department.
 *    - Summarizes document distribution by category.
 *    - Calculates workflow SLA turnaround velocity and approval rates.
 *    - Gathers recent chronological activity timeline.
 * 2. `getUserMetrics()`:
 *    - Tailors real-time dashboard KPIs for the authenticated user (my documents,
 *      my pending requests, my approved requests, my rejected requests, unread
 *      notifications, and actionable approvals waiting in queue).
 * ============================================================================
 */

import { Request, Response } from 'express';
import { getDatabase } from '../db/database';
import { sendSuccess, sendError } from '../utils/response';

export class AnalyticsController {
  static async getAdminMetrics(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();

      // System KPIs
      const totalUsers = (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c;
      const activeUsers = (db.prepare('SELECT COUNT(*) as c FROM users WHERE is_active = 1').get() as any).c;
      const totalDocuments = (db.prepare("SELECT COUNT(*) as c FROM documents WHERE status != 'deleted'").get() as any).c;
      const pendingWorkflows = (db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status IN ('pending', 'in_progress')").get() as any).c;
      const approvedWorkflows = (db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status = 'approved'").get() as any).c;
      const rejectedWorkflows = (db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE status = 'rejected'").get() as any).c;
      const totalDepartments = (db.prepare('SELECT COUNT(*) as c FROM departments WHERE is_active = 1').get() as any).c;
      const totalWorkflows = (db.prepare('SELECT COUNT(*) as c FROM workflows WHERE is_active = 1').get() as any).c;
      const unreadAlerts = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0').get() as any).c;

      // Users by Role
      const usersByRole = db.prepare(`
        SELECT role, COUNT(*) as count 
        FROM users 
        GROUP BY role
      `).all() as any[];

      // Users by Department
      const usersByDept = db.prepare(`
        SELECT d.name as department_name, d.code as department_code, COUNT(u.user_id) as count
        FROM departments d
        LEFT JOIN users u ON d.department_id = u.department_id
        GROUP BY d.department_id
      `).all() as any[];

      // Documents by Category
      const docsByCategory = db.prepare(`
        SELECT c.name as category_name, c.color as category_color, COUNT(d.document_id) as count
        FROM doc_categories c
        LEFT JOIN documents d ON c.category_id = d.category_id AND d.status != 'deleted'
        GROUP BY c.category_id
      `).all() as any[];

      // Documents by Status
      const docsByStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM documents
        WHERE status != 'deleted'
        GROUP BY status
      `).all() as any[];

      // Workflow Status Breakdown
      const workflowsByStatus = db.prepare(`
        SELECT status, COUNT(*) as count
        FROM workflow_instances
        GROUP BY status
      `).all() as any[];

      // Recent 10 Audit Events
      const recentAudit = db.prepare(`
        SELECT a.log_id, a.action, a.resource_type, a.created_at, u.full_name as user_name, u.email as user_email
        FROM audit_logs a
        LEFT JOIN users u ON a.user_id = u.user_id
        ORDER BY a.created_at DESC
        LIMIT 8
      `).all() as any[];

      sendSuccess(res, {
        kpis: {
          totalUsers,
          activeUsers,
          totalDocuments,
          pendingWorkflows,
          approvedWorkflows,
          rejectedWorkflows,
          totalDepartments,
          totalWorkflows,
          unreadAlerts,
        },
        usersByRole,
        usersByDept,
        docsByCategory,
        docsByStatus,
        workflowsByStatus,
        recentAudit,
      });
    } catch (err: any) {
      sendError(res, 'ADMIN_METRICS_ERROR', err.message, 500);
    }
  }

  static async getUserDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const db = getDatabase();

      // User specific counts
      const myDocuments = (db.prepare("SELECT COUNT(*) as c FROM documents WHERE uploaded_by = ? AND status != 'deleted'").get(user.userId) as any).c;
      const myPendingRequests = (db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE submitted_by = ? AND status IN ('pending', 'in_progress')").get(user.userId) as any).c;
      const myApprovedRequests = (db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE submitted_by = ? AND status = 'approved'").get(user.userId) as any).c;
      const myRejectedRequests = (db.prepare("SELECT COUNT(*) as c FROM workflow_instances WHERE submitted_by = ? AND status = 'rejected'").get(user.userId) as any).c;
      const unreadNotifications = (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').get(user.userId) as any).c;

      // Pending approvals count for this user
      let pendingApprovalsCount = 0;
      if (user.role !== 'STUDENT') {
        let whereClauses = ["wi.status IN ('pending', 'in_progress')"];
        let params: any[] = [];

        if (user.role === 'SUPER_ADMIN') {
          whereClauses.push('(ws.approver_role = \'SUPER_ADMIN\' OR ws.approver_user_id = ?)');
          params.push(user.userId);
        } else if (user.role === 'DEPT_ADMIN' || user.role === 'FACULTY') {
          whereClauses.push(`(
            (ws.approver_role = ? AND (d.department_id = ? OR w.department_id = ?))
            OR ws.approver_user_id = ?
          )`);
          params.push(user.role, user.departmentId || '', user.departmentId || '', user.userId);
        }

        const countPending = db.prepare(`
          SELECT COUNT(*) as c
          FROM workflow_instances wi
          JOIN workflows w ON wi.workflow_id = w.workflow_id
          JOIN documents d ON wi.document_id = d.document_id
          JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
          WHERE ${whereClauses.join(' AND ')}
        `).get(...params) as any;

        pendingApprovalsCount = countPending ? countPending.c : 0;
      }

      // Recent 5 documents
      const recentDocuments = db.prepare(`
        SELECT d.*, c.name as category_name, c.color as category_color, dept.name as department_name
        FROM documents d
        LEFT JOIN doc_categories c ON d.category_id = c.category_id
        LEFT JOIN departments dept ON d.department_id = dept.department_id
        WHERE d.uploaded_by = ? AND d.status != 'deleted'
        ORDER BY d.created_at DESC
        LIMIT 5
      `).all(user.userId) as any[];

      // Recent 5 workflow requests
      const recentWorkflows = db.prepare(`
        SELECT wi.*, w.name as workflow_name, d.title as document_title, ws.step_name as current_step_name, ws.step_order as current_step_order
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        JOIN documents d ON wi.document_id = d.document_id
        LEFT JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE wi.submitted_by = ?
        ORDER BY wi.submitted_at DESC
        LIMIT 5
      `).all(user.userId) as any[];

      sendSuccess(res, {
        summary: {
          myDocuments,
          myPendingRequests,
          myApprovedRequests,
          myRejectedRequests,
          unreadNotifications,
          pendingApprovalsCount,
        },
        recentDocuments: recentDocuments.map(d => ({ ...d, is_confidential: Boolean(d.is_confidential) })),
        recentWorkflows,
      });
    } catch (err: any) {
      sendError(res, 'USER_METRICS_ERROR', err.message, 500);
    }
  }
}
