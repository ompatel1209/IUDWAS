/**
 * ============================================================================
 * MODULE: Workflow Execution & Approval Engine Controller (workflow-instances.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Core state machine and execution engine for active document approval requests.
 * Manages multi-step sequential state transitions, role authorizations, step logs,
 * reviewer delegation, notifications, and immutable audit trails.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `startWorkflow()`:
 *    - Binds a user document to a workflow template.
 *    - Sets initial state (`status = 'pending'`, `current_step_id = step 1`).
 *    - Dispatches notifications to authorized step reviewers.
 * 2. `listInstances()`:
 *    - Paginated retrieval of approval requests. Students see submitted requests;
 *      faculty/admins see departmental and pending review queues.
 * 3. `getInstanceById()`:
 *    - Retrieves complete request status, document details, active step, and
 *      the complete chronological audit history of step approvals/comments.
 * 4. `getPendingApprovalsForUser()`:
 *    - Queries all actionable workflow requests waiting for the current user's
 *      review based on assigned role and department.
 * 5. `approveStep()`:
 *    - Validates reviewer role authorization for the active step.
 *    - Records decision in `workflow_step_logs`.
 *    - Automatically transitions to the next step (`step_order + 1`), or marks
 *      the request as fully `approved` if the final stage is reached.
 * 6. `rejectStep()`:
 *    - Enforces mandatory rejection reason/comments.
 *    - Transitions state to `rejected` and dispatches immediate notification to submitter.
 * 7. `delegateStep()`:
 *    - Transfers review responsibility for a step to another authorized faculty/admin.
 * ============================================================================
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { sendSuccess, sendError } from '../utils/response';
import { recordAuditLog } from '../middleware/audit.middleware';
import { UserRole } from '../types';

export class WorkflowInstancesController {
  static async startWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflow_id, document_id, comments = '' } = req.body;
      const user = req.user!;

      if (!workflow_id || !document_id) {
        sendError(res, 'VALIDATION_ERROR', 'Workflow ID and Document ID are required', 400);
        return;
      }

      const db = getDatabase();

      // Check template
      const wf = db.prepare('SELECT * FROM workflows WHERE workflow_id = ? AND is_active = 1').get(workflow_id) as any;
      if (!wf) {
        sendError(res, 'WORKFLOW_NOT_FOUND', 'Active workflow template not found', 404);
        return;
      }

      // Check document
      const doc = db.prepare('SELECT * FROM documents WHERE document_id = ? AND status != \'deleted\'').get(document_id) as any;
      if (!doc) {
        sendError(res, 'DOCUMENT_NOT_FOUND', 'Document not found or deleted', 404);
        return;
      }

      // Check initial step
      const step1 = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? AND step_order = 1').get(workflow_id) as any;
      if (!step1) {
        sendError(res, 'INVALID_WORKFLOW', 'Workflow template has no configured approval steps', 400);
        return;
      }

      const instanceId = uuidv4();
      const logId = uuidv4();

      const startTx = db.transaction(() => {
        // Create instance
        db.prepare(`
          INSERT INTO workflow_instances (
            instance_id, workflow_id, document_id, submitted_by, current_step_id, status, comments,
            submitted_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'), datetime('now'))
        `).run(instanceId, workflow_id, document_id, user.userId, step1.step_id, comments);

        // Record initial step log
        db.prepare(`
          INSERT INTO workflow_step_logs (log_id, instance_id, step_id, actor_id, action, comments, created_at)
          VALUES (?, ?, ?, ?, 'SUBMIT', ?, datetime('now'))
        `).run(logId, instanceId, step1.step_id, user.userId, comments || 'Submitted workflow request');

        // Notify submitter
        db.prepare(`
          INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
          VALUES (?, ?, 'in_app', 'Workflow Request Submitted', ?, 0, 'workflow_instance', ?, datetime('now'))
        `).run(
          uuidv4(),
          user.userId,
          `Your request "${wf.name}" for document "${doc.title}" was submitted and is pending ${step1.step_name}.`,
          instanceId
        );

        // Notify step 1 approver(s)
        if (step1.approver_user_id) {
          db.prepare(`
            INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
            VALUES (?, ?, 'in_app', 'Action Required: Workflow Approval', ?, 0, 'workflow_instance', ?, datetime('now'))
          `).run(
            uuidv4(),
            step1.approver_user_id,
            `Action required on "${wf.name}" submitted by ${user.email}.`,
            instanceId
          );
        } else {
          // Notify role-based approvers in department
          const eligibleApprovers = db.prepare(`
            SELECT user_id FROM users 
            WHERE role = ? AND (department_id = ? OR department_id IS NULL) AND is_active = 1
          `).all(step1.approver_role, doc.department_id || user.departmentId) as any[];

          const insertNotif = db.prepare(`
            INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
            VALUES (?, ?, 'in_app', 'Action Required: Workflow Approval', ?, 0, 'workflow_instance', ?, datetime('now'))
          `);

          for (const appUser of eligibleApprovers) {
            insertNotif.run(
              uuidv4(),
              appUser.user_id,
              `Action required for step "${step1.step_name}" on request submitted by ${user.email}.`,
              instanceId
            );
          }
        }
      });

      startTx();

      recordAuditLog(user.userId, 'WORKFLOW_SUBMIT', 'WORKFLOW_INSTANCE', instanceId, req.ip, req.headers['user-agent'] as string, {
        workflow_id,
        document_id,
        workflow_name: wf.name,
      });

      const created = db.prepare(`
        SELECT wi.*, w.name as workflow_name, d.title as document_title, ws.step_name as current_step_name, ws.approver_role as current_approver_role
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        JOIN documents d ON wi.document_id = d.document_id
        LEFT JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE wi.instance_id = ?
      `).get(instanceId);

      sendSuccess(res, created, undefined, 201);
    } catch (err: any) {
      sendError(res, 'WORKFLOW_START_ERROR', err.message, 500);
    }
  }

  static async listInstances(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);
      const offset = (page - 1) * limit;
      const status = req.query.status as string;
      const workflowId = req.query.workflow_id as string;
      const user = req.user!;
      const db = getDatabase();

      let whereClauses: string[] = ['1=1'];
      let params: any[] = [];

      // If student, only their own
      if (user.role === 'STUDENT') {
        whereClauses.push('wi.submitted_by = ?');
        params.push(user.userId);
      } else if (user.role === 'FACULTY' || user.role === 'DEPT_ADMIN') {
        const type = req.query.scope as string;
        if (type === 'mine') {
          whereClauses.push('wi.submitted_by = ?');
          params.push(user.userId);
        } else if (user.role === 'DEPT_ADMIN' && user.departmentId) {
          whereClauses.push('(w.department_id = ? OR d.department_id = ? OR wi.submitted_by = ?)');
          params.push(user.departmentId, user.departmentId, user.userId);
        }
      }

      if (status) {
        whereClauses.push('wi.status = ?');
        params.push(status);
      }

      if (workflowId) {
        whereClauses.push('wi.workflow_id = ?');
        params.push(workflowId);
      }

      const whereSql = whereClauses.join(' AND ');

      const countRow = db.prepare(`
        SELECT COUNT(*) as total 
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        JOIN documents d ON wi.document_id = d.document_id
        WHERE ${whereSql}
      `).get(...params) as { total: number };

      const total = countRow.total;
      const totalPages = Math.ceil(total / limit);

      const instances = db.prepare(`
        SELECT wi.*, 
               w.name as workflow_name, w.max_days_sla,
               d.title as document_title, d.file_name, d.file_type, d.file_size,
               u.full_name as submitter_name, u.email as submitter_email,
               ws.step_name as current_step_name, ws.step_order as current_step_order, ws.approver_role as current_approver_role, ws.sla_hours as step_sla_hours
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        JOIN documents d ON wi.document_id = d.document_id
        JOIN users u ON wi.submitted_by = u.user_id
        LEFT JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE ${whereSql}
        ORDER BY wi.submitted_at DESC
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as any[];

      sendSuccess(res, instances, {
        page,
        limit,
        total,
        totalPages,
      });
    } catch (err: any) {
      sendError(res, 'WORKFLOW_INSTANCES_ERROR', err.message, 500);
    }
  }

  static async getPendingApprovals(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user!;
      const db = getDatabase();

      if (user.role === 'STUDENT') {
        sendSuccess(res, []);
        return;
      }

      let whereClauses = ["wi.status IN ('pending', 'in_progress')"];
      let params: any[] = [];

      if (user.role === 'SUPER_ADMIN') {
        whereClauses.push('(ws.approver_role = \'SUPER_ADMIN\' OR ws.approver_user_id = ?)');
        params.push(user.userId);
      } else if (user.role === 'DEPT_ADMIN') {
        whereClauses.push(`(
          (ws.approver_role = 'DEPT_ADMIN' AND (d.department_id = ? OR w.department_id = ?))
          OR ws.approver_user_id = ?
        )`);
        params.push(user.departmentId || '', user.departmentId || '', user.userId);
      } else if (user.role === 'FACULTY') {
        whereClauses.push(`(
          (ws.approver_role = 'FACULTY' AND (d.department_id = ? OR w.department_id = ?))
          OR ws.approver_user_id = ?
        )`);
        params.push(user.departmentId || '', user.departmentId || '', user.userId);
      }

      const whereSql = whereClauses.join(' AND ');

      const pending = db.prepare(`
        SELECT wi.*, 
               w.name as workflow_name, w.max_days_sla,
               d.title as document_title, d.file_name, d.file_type, d.file_size,
               u.full_name as submitter_name, u.email as submitter_email,
               ws.step_name as current_step_name, ws.step_order as current_step_order, ws.sla_hours as step_sla_hours
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        JOIN documents d ON wi.document_id = d.document_id
        JOIN users u ON wi.submitted_by = u.user_id
        JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE ${whereSql}
        ORDER BY wi.submitted_at ASC
      `).all(...params) as any[];

      sendSuccess(res, pending);
    } catch (err: any) {
      sendError(res, 'PENDING_APPROVALS_ERROR', err.message, 500);
    }
  }

  static async getInstanceById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const db = getDatabase();

      const instance = db.prepare(`
        SELECT wi.*, 
               w.name as workflow_name, w.description as workflow_description, w.max_days_sla,
               d.title as document_title, d.file_name, d.file_type, d.file_size, d.mime_type, d.ocr_text,
               u.full_name as submitter_name, u.email as submitter_email,
               ws.step_name as current_step_name, ws.step_order as current_step_order, ws.approver_role as current_approver_role
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        JOIN documents d ON wi.document_id = d.document_id
        JOIN users u ON wi.submitted_by = u.user_id
        LEFT JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE wi.instance_id = ?
      `).get(id) as any;

      if (!instance) {
        sendError(res, 'INSTANCE_NOT_FOUND', 'Workflow instance not found', 404);
        return;
      }

      // Check authorization
      if (user.role === 'STUDENT' && instance.submitted_by !== user.userId) {
        sendError(res, 'FORBIDDEN', 'Access to this workflow instance is restricted', 403);
        return;
      }

      // Steps in template
      const steps = db.prepare(`
        SELECT s.*, u.full_name as approver_user_name
        FROM workflow_steps s
        LEFT JOIN users u ON s.approver_user_id = u.user_id
        WHERE s.workflow_id = ?
        ORDER BY s.step_order ASC
      `).all(instance.workflow_id) as any[];

      // Action logs
      const logs = db.prepare(`
        SELECT l.*, u.full_name as actor_name, u.email as actor_email, u.role as actor_role, ws.step_name
        FROM workflow_step_logs l
        JOIN users u ON l.actor_id = u.user_id
        LEFT JOIN workflow_steps ws ON l.step_id = ws.step_id
        WHERE l.instance_id = ?
        ORDER BY l.created_at ASC
      `).all(id) as any[];

      sendSuccess(res, {
        ...instance,
        steps,
        logs,
      });
    } catch (err: any) {
      sendError(res, 'INSTANCE_GET_ERROR', err.message, 500);
    }
  }

  static async approveStep(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comments = 'Approved' } = req.body;
      const user = req.user!;
      const db = getDatabase();

      const instance = db.prepare(`
        SELECT wi.*, w.name as workflow_name, d.title as document_title, ws.step_order, ws.step_name, ws.approver_role, ws.approver_user_id
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        JOIN documents d ON wi.document_id = d.document_id
        LEFT JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE wi.instance_id = ?
      `).get(id) as any;

      if (!instance) {
        sendError(res, 'INSTANCE_NOT_FOUND', 'Workflow instance not found', 404);
        return;
      }

      if (!['pending', 'in_progress'].includes(instance.status)) {
        sendError(res, 'INVALID_STATUS', `Cannot approve workflow in status '${instance.status}'`, 400);
        return;
      }

      // Check current step exists
      if (!instance.current_step_id) {
        sendError(res, 'NO_ACTIVE_STEP', 'No active step found for this workflow', 400);
        return;
      }

      // Verify approver permission
      const isDirectApprover = instance.approver_user_id === user.userId;
      const hasRoleMatch = instance.approver_role === user.role || user.role === 'SUPER_ADMIN';

      if (!isDirectApprover && !hasRoleMatch) {
        sendError(res, 'UNAUTHORIZED_APPROVER', `You do not have permission to approve step '${instance.step_name}'`, 403);
        return;
      }

      // Find next step
      const nextStep = db.prepare(`
        SELECT * FROM workflow_steps 
        WHERE workflow_id = ? AND step_order = ?
      `).get(instance.workflow_id, instance.step_order + 1) as any;

      const approveTx = db.transaction(() => {
        // Record step log
        db.prepare(`
          INSERT INTO workflow_step_logs (log_id, instance_id, step_id, actor_id, action, comments, created_at)
          VALUES (?, ?, ?, ?, 'APPROVE', ?, datetime('now'))
        `).run(uuidv4(), id, instance.current_step_id, user.userId, comments);

        if (nextStep) {
          // Advance to next step
          db.prepare(`
            UPDATE workflow_instances 
            SET current_step_id = ?, status = 'in_progress', updated_at = datetime('now')
            WHERE instance_id = ?
          `).run(nextStep.step_id, id);

          // Notify next approver
          if (nextStep.approver_user_id) {
            db.prepare(`
              INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
              VALUES (?, ?, 'in_app', 'Workflow Approval Required', ?, 0, 'workflow_instance', ?, datetime('now'))
            `).run(
              uuidv4(),
              nextStep.approver_user_id,
              `Action required for step "${nextStep.step_name}" on "${instance.workflow_name}".`,
              id
            );
          }

          // Notify submitter of advancement
          db.prepare(`
            INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
            VALUES (?, ?, 'in_app', 'Workflow Step Approved', ?, 0, 'workflow_instance', ?, datetime('now'))
          `).run(
            uuidv4(),
            instance.submitted_by,
            `Step "${instance.step_name}" was approved by ${user.email}. Moving to step "${nextStep.step_name}".`,
            id
          );
        } else {
          // Final step completed -> mark APPROVED
          db.prepare(`
            UPDATE workflow_instances 
            SET current_step_id = NULL, status = 'approved', completed_at = datetime('now'), updated_at = datetime('now')
            WHERE instance_id = ?
          `).run(id);

          // Notify submitter of final approval
          db.prepare(`
            INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
            VALUES (?, ?, 'in_app', '🎉 Request Approved!', ?, 0, 'workflow_instance', ?, datetime('now'))
          `).run(
            uuidv4(),
            instance.submitted_by,
            `Congratulations! Your workflow request "${instance.workflow_name}" has received final approval.`,
            id
          );
        }
      });

      approveTx();

      recordAuditLog(user.userId, 'WORKFLOW_APPROVE_STEP', 'WORKFLOW_INSTANCE', id, req.ip, req.headers['user-agent'] as string, {
        approved_step: instance.step_name,
        next_step: nextStep ? nextStep.step_name : 'FINAL_APPROVAL',
        comments,
      });

      const updated = db.prepare('SELECT * FROM workflow_instances WHERE instance_id = ?').get(id);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, 'APPROVE_ERROR', err.message, 500);
    }
  }

  static async rejectStep(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const user = req.user!;

      if (!comments || comments.trim().length === 0) {
        sendError(res, 'REASON_REQUIRED', 'A reason/comment is required when rejecting a workflow', 400);
        return;
      }

      const db = getDatabase();

      const instance = db.prepare(`
        SELECT wi.*, w.name as workflow_name, ws.step_name, ws.approver_role, ws.approver_user_id
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        LEFT JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE wi.instance_id = ?
      `).get(id) as any;

      if (!instance) {
        sendError(res, 'INSTANCE_NOT_FOUND', 'Workflow instance not found', 404);
        return;
      }

      if (!['pending', 'in_progress'].includes(instance.status)) {
        sendError(res, 'INVALID_STATUS', `Cannot reject workflow in status '${instance.status}'`, 400);
        return;
      }

      const rejectTx = db.transaction(() => {
        // Record log
        db.prepare(`
          INSERT INTO workflow_step_logs (log_id, instance_id, step_id, actor_id, action, comments, created_at)
          VALUES (?, ?, ?, ?, 'REJECT', ?, datetime('now'))
        `).run(uuidv4(), id, instance.current_step_id, user.userId, comments.trim());

        // Update instance to REJECTED
        db.prepare(`
          UPDATE workflow_instances 
          SET status = 'rejected', comments = ?, completed_at = datetime('now'), updated_at = datetime('now')
          WHERE instance_id = ?
        `).run(comments.trim(), id);

        // Notify submitter
        db.prepare(`
          INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
          VALUES (?, ?, 'in_app', 'Request Rejected', ?, 0, 'workflow_instance', ?, datetime('now'))
        `).run(
          uuidv4(),
          instance.submitted_by,
          `Your request "${instance.workflow_name}" was rejected at step "${instance.step_name || 'Review'}". Reason: ${comments.trim()}`,
          id
        );
      });

      rejectTx();

      recordAuditLog(user.userId, 'WORKFLOW_REJECT_STEP', 'WORKFLOW_INSTANCE', id, req.ip, req.headers['user-agent'] as string, {
        step: instance.step_name,
        comments,
      });

      const updated = db.prepare('SELECT * FROM workflow_instances WHERE instance_id = ?').get(id);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, 'REJECT_ERROR', err.message, 500);
    }
  }

  static async delegateStep(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { delegate_user_id, comments = 'Delegated' } = req.body;
      const user = req.user!;

      if (!delegate_user_id) {
        sendError(res, 'VALIDATION_ERROR', 'Delegate user ID is required', 400);
        return;
      }

      const db = getDatabase();
      const delegateUser = db.prepare('SELECT * FROM users WHERE user_id = ? AND is_active = 1').get(delegate_user_id) as any;
      if (!delegateUser) {
        sendError(res, 'DELEGATEE_NOT_FOUND', 'Active target user to delegate to was not found', 404);
        return;
      }

      const instance = db.prepare(`
        SELECT wi.*, w.name as workflow_name, ws.step_name 
        FROM workflow_instances wi
        JOIN workflows w ON wi.workflow_id = w.workflow_id
        LEFT JOIN workflow_steps ws ON wi.current_step_id = ws.step_id
        WHERE wi.instance_id = ?
      `).get(id) as any;

      if (!instance || !instance.current_step_id) {
        sendError(res, 'INSTANCE_NOT_FOUND', 'Active workflow instance not found', 404);
        return;
      }

      const delegateTx = db.transaction(() => {
        db.prepare(`
          INSERT INTO workflow_step_logs (log_id, instance_id, step_id, actor_id, action, comments, created_at)
          VALUES (?, ?, ?, ?, 'DELEGATE', ?, datetime('now'))
        `).run(uuidv4(), id, instance.current_step_id, user.userId, `Delegated to ${delegateUser.full_name}: ${comments}`);

        db.prepare(`
          UPDATE workflow_steps SET approver_user_id = ? WHERE step_id = ?
        `).run(delegate_user_id, instance.current_step_id);

        db.prepare(`
          INSERT INTO notifications (notification_id, user_id, type, title, message, is_read, related_resource_type, related_resource_id, created_at)
          VALUES (?, ?, 'in_app', 'Workflow Approval Delegated to You', ?, 0, 'workflow_instance', ?, datetime('now'))
        `).run(
          uuidv4(),
          delegate_user_id,
          `${user.email} delegated the approval step "${instance.step_name}" on "${instance.workflow_name}" to you.`,
          id
        );
      });

      delegateTx();

      recordAuditLog(user.userId, 'WORKFLOW_DELEGATE_STEP', 'WORKFLOW_INSTANCE', id, req.ip, req.headers['user-agent'] as string, {
        to_user: delegateUser.email,
        comments,
      });

      sendSuccess(res, { message: `Workflow step delegated successfully to ${delegateUser.full_name}` });
    } catch (err: any) {
      sendError(res, 'DELEGATE_ERROR', err.message, 500);
    }
  }
}
