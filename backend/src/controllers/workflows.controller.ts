/**
 * ============================================================================
 * MODULE: Workflow Template Builder Controller (workflows.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Provides CRUD, cloning, step ordering, and SLA configuration for reusable
 * institutional multi-step workflow templates (e.g. Course Exemption, Research
 * Grant Review, Thesis Defense Approval).
 * 
 * WHAT THIS MODULE DOES:
 * 1. `listWorkflows()`:
 *    - Lists all active and configured workflow templates with step counts
 *      and active execution metrics.
 * 2. `getWorkflowById()`:
 *    - Retrieves complete template specification including sequential approval
 *      steps (`step_order`), required approver roles, and SLA hour targets.
 * 3. `createWorkflow()`:
 *    - Validates template name, SLA days, and ordered steps array.
 *    - Executes atomic transaction to insert master workflow and all step rows.
 * 4. `updateWorkflow()`:
 *    - Updates template attributes, auto-escalation flags, and re-sequences steps.
 * 5. `duplicateWorkflow()`:
 *    - Deep clones an existing workflow template and its step definitions.
 * 6. `deleteWorkflow()`:
 *    - Safe deletes or deactivates workflow templates with dependent instances.
 * ============================================================================
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { sendSuccess, sendError } from '../utils/response';
import { recordAuditLog } from '../middleware/audit.middleware';
import { UserRole } from '../types';

export class WorkflowsController {
  static async listWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const departmentId = req.query.department_id as string;
      const user = req.user!;

      let whereSql = '1=1';
      let params: any[] = [];

      if (user.role === 'DEPT_ADMIN' && user.departmentId) {
        whereSql = '(w.department_id = ? OR w.department_id IS NULL)';
        params.push(user.departmentId);
      } else if (departmentId) {
        whereSql = '(w.department_id = ? OR w.department_id IS NULL)';
        params.push(departmentId);
      }

      const workflows = db.prepare(`
        SELECT w.*, 
               u.full_name as creator_name,
               d.name as department_name, d.code as department_code,
               (SELECT COUNT(*) FROM workflow_steps WHERE workflow_id = w.workflow_id) as step_count,
               (SELECT COUNT(*) FROM workflow_instances WHERE workflow_id = w.workflow_id) as instance_count
        FROM workflows w
        LEFT JOIN users u ON w.created_by = u.user_id
        LEFT JOIN departments d ON w.department_id = d.department_id
        WHERE ${whereSql}
        ORDER BY w.name ASC
      `).all(...params) as any[];

      sendSuccess(res, workflows.map(w => ({
        ...w,
        is_active: Boolean(w.is_active),
        auto_escalate: Boolean(w.auto_escalate),
      })));
    } catch (err: any) {
      sendError(res, 'WORKFLOWS_LIST_ERROR', err.message, 500);
    }
  }

  static async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const workflow = db.prepare(`
        SELECT w.*, 
               u.full_name as creator_name,
               d.name as department_name, d.code as department_code
        FROM workflows w
        LEFT JOIN users u ON w.created_by = u.user_id
        LEFT JOIN departments d ON w.department_id = d.department_id
        WHERE w.workflow_id = ?
      `).get(id) as any;

      if (!workflow) {
        sendError(res, 'WORKFLOW_NOT_FOUND', 'Workflow template not found', 404);
        return;
      }

      // Fetch steps
      const steps = db.prepare(`
        SELECT s.*, u.full_name as approver_user_name, u.email as approver_user_email
        FROM workflow_steps s
        LEFT JOIN users u ON s.approver_user_id = u.user_id
        WHERE s.workflow_id = ?
        ORDER BY s.step_order ASC
      `).all(id) as any[];

      sendSuccess(res, {
        ...workflow,
        is_active: Boolean(workflow.is_active),
        auto_escalate: Boolean(workflow.auto_escalate),
        steps: steps.map(s => ({
          ...s,
          is_parallel: Boolean(s.is_parallel),
        })),
      });
    } catch (err: any) {
      sendError(res, 'WORKFLOW_GET_ERROR', err.message, 500);
    }
  }

  static async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { name, description, department_id, max_days_sla = 5, auto_escalate = true, steps = [] } = req.body;
      const user = req.user!;

      if (!name) {
        sendError(res, 'VALIDATION_ERROR', 'Workflow name is required', 400);
        return;
      }

      if (!Array.isArray(steps) || steps.length === 0) {
        sendError(res, 'VALIDATION_ERROR', 'A workflow must contain at least one approval step', 400);
        return;
      }

      const db = getDatabase();
      const workflowId = uuidv4();

      const createTx = db.transaction(() => {
        db.prepare(`
          INSERT INTO workflows (
            workflow_id, name, description, department_id, created_by, is_active, max_days_sla, auto_escalate, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'))
        `).run(
          workflowId,
          name.trim(),
          description || null,
          department_id || null,
          user.userId,
          max_days_sla,
          auto_escalate ? 1 : 0
        );

        const insertStep = db.prepare(`
          INSERT INTO workflow_steps (
            step_id, workflow_id, step_order, step_name, approver_role, approver_user_id,
            is_parallel, sla_hours, on_approve_action, on_reject_action
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        steps.forEach((step: any, idx: number) => {
          const stepId = uuidv4();
          insertStep.run(
            stepId,
            workflowId,
            idx + 1,
            step.step_name || `Step ${idx + 1}`,
            step.approver_role || 'FACULTY',
            step.approver_user_id || null,
            step.is_parallel ? 1 : 0,
            step.sla_hours || 48,
            step.on_approve_action || (idx === steps.length - 1 ? 'FINALIZE_APPROVE' : 'NEXT_STEP'),
            step.on_reject_action || 'REJECT_WORKFLOW'
          );
        });
      });

      createTx();

      recordAuditLog(user.userId, 'WORKFLOW_TEMPLATE_CREATE', 'WORKFLOW', workflowId, req.ip, req.headers['user-agent'] as string, { name, step_count: steps.length });

      const created = db.prepare('SELECT * FROM workflows WHERE workflow_id = ?').get(workflowId) as any;
      sendSuccess(res, created, undefined, 201);
    } catch (err: any) {
      sendError(res, 'WORKFLOW_CREATE_ERROR', err.message, 500);
    }
  }

  static async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, department_id, max_days_sla, auto_escalate, is_active, steps } = req.body;
      const user = req.user!;
      const db = getDatabase();

      const current = db.prepare('SELECT * FROM workflows WHERE workflow_id = ?').get(id) as any;
      if (!current) {
        sendError(res, 'WORKFLOW_NOT_FOUND', 'Workflow template not found', 404);
        return;
      }

      const updateTx = db.transaction(() => {
        db.prepare(`
          UPDATE workflows 
          SET name = ?, description = ?, department_id = ?, max_days_sla = ?, auto_escalate = ?, is_active = ?, updated_at = datetime('now')
          WHERE workflow_id = ?
        `).run(
          name !== undefined ? name.trim() : current.name,
          description !== undefined ? description : current.description,
          department_id !== undefined ? department_id : current.department_id,
          max_days_sla !== undefined ? max_days_sla : current.max_days_sla,
          auto_escalate !== undefined ? (auto_escalate ? 1 : 0) : current.auto_escalate,
          is_active !== undefined ? (is_active ? 1 : 0) : current.is_active,
          id
        );

        if (steps && Array.isArray(steps) && steps.length > 0) {
          db.prepare('DELETE FROM workflow_steps WHERE workflow_id = ?').run(id);

          const insertStep = db.prepare(`
            INSERT INTO workflow_steps (
              step_id, workflow_id, step_order, step_name, approver_role, approver_user_id,
              is_parallel, sla_hours, on_approve_action, on_reject_action
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          steps.forEach((step: any, idx: number) => {
            const stepId = step.step_id || uuidv4();
            insertStep.run(
              stepId,
              id,
              idx + 1,
              step.step_name || `Step ${idx + 1}`,
              step.approver_role || 'FACULTY',
              step.approver_user_id || null,
              step.is_parallel ? 1 : 0,
              step.sla_hours || 48,
              step.on_approve_action || (idx === steps.length - 1 ? 'FINALIZE_APPROVE' : 'NEXT_STEP'),
              step.on_reject_action || 'REJECT_WORKFLOW'
            );
          });
        }
      });

      updateTx();

      recordAuditLog(user.userId, 'WORKFLOW_TEMPLATE_UPDATE', 'WORKFLOW', id, req.ip, req.headers['user-agent'] as string, { changes: req.body });

      const updated = db.prepare('SELECT * FROM workflows WHERE workflow_id = ?').get(id);
      sendSuccess(res, updated);
    } catch (err: any) {
      sendError(res, 'WORKFLOW_UPDATE_ERROR', err.message, 500);
    }
  }

  static async duplicateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const db = getDatabase();

      const source = db.prepare('SELECT * FROM workflows WHERE workflow_id = ?').get(id) as any;
      if (!source) {
        sendError(res, 'WORKFLOW_NOT_FOUND', 'Workflow template not found', 404);
        return;
      }

      const sourceSteps = db.prepare('SELECT * FROM workflow_steps WHERE workflow_id = ? ORDER BY step_order ASC').all(id) as any[];

      const newWfId = uuidv4();
      const duplicateTx = db.transaction(() => {
        db.prepare(`
          INSERT INTO workflows (
            workflow_id, name, description, department_id, created_by, is_active, max_days_sla, auto_escalate, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, datetime('now'), datetime('now'))
        `).run(
          newWfId,
          `${source.name} (Copy)`,
          source.description,
          source.department_id,
          user.userId,
          source.max_days_sla,
          source.auto_escalate
        );

        const insertStep = db.prepare(`
          INSERT INTO workflow_steps (
            step_id, workflow_id, step_order, step_name, approver_role, approver_user_id,
            is_parallel, sla_hours, on_approve_action, on_reject_action
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        sourceSteps.forEach(s => {
          insertStep.run(
            uuidv4(),
            newWfId,
            s.step_order,
            s.step_name,
            s.approver_role,
            s.approver_user_id,
            s.is_parallel,
            s.sla_hours,
            s.on_approve_action,
            s.on_reject_action
          );
        });
      });

      duplicateTx();

      recordAuditLog(user.userId, 'WORKFLOW_DUPLICATE', 'WORKFLOW', newWfId, req.ip, req.headers['user-agent'] as string, { source_id: id });

      const created = db.prepare('SELECT * FROM workflows WHERE workflow_id = ?').get(newWfId);
      sendSuccess(res, created, undefined, 201);
    } catch (err: any) {
      sendError(res, 'WORKFLOW_DUPLICATE_ERROR', err.message, 500);
    }
  }

  static async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!;
      const db = getDatabase();

      const instancesCount = db.prepare('SELECT COUNT(*) as c FROM workflow_instances WHERE workflow_id = ?').get(id) as { c: number };
      if (instancesCount.c > 0) {
        db.prepare('UPDATE workflows SET is_active = 0, updated_at = datetime(\'now\') WHERE workflow_id = ?').run(id);
        recordAuditLog(user.userId, 'WORKFLOW_DEACTIVATED', 'WORKFLOW', id, req.ip, req.headers['user-agent'] as string);
        sendSuccess(res, { message: 'Workflow template has existing instances. It was deactivated safely.' });
        return;
      }

      db.prepare('DELETE FROM workflow_steps WHERE workflow_id = ?').run(id);
      db.prepare('DELETE FROM workflows WHERE workflow_id = ?').run(id);

      recordAuditLog(user.userId, 'WORKFLOW_DELETED', 'WORKFLOW', id, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, { message: 'Workflow template removed successfully' });
    } catch (err: any) {
      sendError(res, 'WORKFLOW_DELETE_ERROR', err.message, 500);
    }
  }
}
