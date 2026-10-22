/**
 * ============================================================================
 * MODULE: Institutional Academic Departments Controller (departments.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Manages academic departments, hierarchical division relationships (parent/child),
 * department chair assignments, member counts, and document counts.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `listDepartments()`:
 *    - Lists all university departments with department head name and aggregates
 *      for total members and vault documents.
 * 2. `getDepartmentById()`:
 *    - Retrieves single department profile and hierarchy metadata.
 * 3. `createDepartment()`:
 *    - Validates department code uniqueness and inserts new department record.
 * 4. `updateDepartment()`:
 *    - Updates department name, code, chair/head user ID, parent department,
 *      and active status.
 * 5. `deleteDepartment()`:
 *    - Deletes or safely deactivates departments with active members/documents.
 * ============================================================================
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { sendSuccess, sendError } from '../utils/response';
import { recordAuditLog } from '../middleware/audit.middleware';

export class DepartmentsController {
  static async listDepartments(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const departments = db.prepare(`
        SELECT d.*, 
               u.full_name as head_user_name, u.email as head_user_email,
               p.name as parent_dept_name,
               (SELECT COUNT(*) FROM users WHERE department_id = d.department_id) as user_count,
               (SELECT COUNT(*) FROM documents WHERE department_id = d.department_id) as document_count
        FROM departments d
        LEFT JOIN users u ON d.head_user_id = u.user_id
        LEFT JOIN departments p ON d.parent_dept_id = p.department_id
        ORDER BY d.name ASC
      `).all() as any[];

      const formatted = departments.map(d => ({
        ...d,
        is_active: Boolean(d.is_active),
      }));

      sendSuccess(res, formatted);
    } catch (err: any) {
      sendError(res, 'DEPTS_LIST_ERROR', err.message, 500);
    }
  }

  static async getDepartmentById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const department = db.prepare(`
        SELECT d.*, 
               u.full_name as head_user_name, u.email as head_user_email,
               p.name as parent_dept_name,
               (SELECT COUNT(*) FROM users WHERE department_id = d.department_id) as user_count,
               (SELECT COUNT(*) FROM documents WHERE department_id = d.department_id) as document_count
        FROM departments d
        LEFT JOIN users u ON d.head_user_id = u.user_id
        LEFT JOIN departments p ON d.parent_dept_id = p.department_id
        WHERE d.department_id = ?
      `).get(id) as any;

      if (!department) {
        sendError(res, 'DEPARTMENT_NOT_FOUND', 'Department not found', 404);
        return;
      }

      sendSuccess(res, {
        ...department,
        is_active: Boolean(department.is_active),
      });
    } catch (err: any) {
      sendError(res, 'DEPT_GET_ERROR', err.message, 500);
    }
  }

  static async createDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, head_user_id, parent_dept_id } = req.body;

      if (!name || !code) {
        sendError(res, 'VALIDATION_ERROR', 'Department name and code are required', 400);
        return;
      }

      const db = getDatabase();

      // Check unique
      const existing = db.prepare('SELECT department_id FROM departments WHERE name = ? OR code = ?').get(name.trim(), code.toUpperCase().trim());
      if (existing) {
        sendError(res, 'DUPLICATE_DEPARTMENT', 'A department with this name or code already exists', 409);
        return;
      }

      const departmentId = uuidv4();
      db.prepare(`
        INSERT INTO departments (department_id, name, code, head_user_id, parent_dept_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
      `).run(departmentId, name.trim(), code.toUpperCase().trim(), head_user_id || null, parent_dept_id || null);

      recordAuditLog(req.user?.userId || null, 'DEPARTMENT_CREATE', 'DEPARTMENT', departmentId, req.ip, req.headers['user-agent'] as string, { name, code });

      const created = db.prepare('SELECT * FROM departments WHERE department_id = ?').get(departmentId) as any;
      sendSuccess(res, { ...created, is_active: Boolean(created.is_active) }, undefined, 201);
    } catch (err: any) {
      sendError(res, 'DEPT_CREATE_ERROR', err.message, 500);
    }
  }

  static async updateDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { name, code, head_user_id, parent_dept_id, is_active } = req.body;

      const db = getDatabase();
      const current = db.prepare('SELECT * FROM departments WHERE department_id = ?').get(id) as any;
      if (!current) {
        sendError(res, 'DEPARTMENT_NOT_FOUND', 'Department not found', 404);
        return;
      }

      const newName = name !== undefined ? name.trim() : current.name;
      const newCode = code !== undefined ? code.toUpperCase().trim() : current.code;
      const newHead = head_user_id !== undefined ? head_user_id : current.head_user_id;
      const newParent = parent_dept_id !== undefined ? parent_dept_id : current.parent_dept_id;
      const newActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;

      // Prevent parent cycle
      if (newParent === id) {
        sendError(res, 'INVALID_PARENT', 'A department cannot be its own parent', 400);
        return;
      }

      db.prepare(`
        UPDATE departments 
        SET name = ?, code = ?, head_user_id = ?, parent_dept_id = ?, is_active = ?
        WHERE department_id = ?
      `).run(newName, newCode, newHead, newParent, newActive, id);

      recordAuditLog(req.user?.userId || null, 'DEPARTMENT_UPDATE', 'DEPARTMENT', id, req.ip, req.headers['user-agent'] as string, { changes: req.body });

      const updated = db.prepare('SELECT * FROM departments WHERE department_id = ?').get(id) as any;
      sendSuccess(res, { ...updated, is_active: Boolean(updated.is_active) });
    } catch (err: any) {
      sendError(res, 'DEPT_UPDATE_ERROR', err.message, 500);
    }
  }

  static async deleteDepartment(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const dept = db.prepare('SELECT * FROM departments WHERE department_id = ?').get(id);
      if (!dept) {
        sendError(res, 'DEPARTMENT_NOT_FOUND', 'Department not found', 404);
        return;
      }

      // Check dependent records
      const userCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE department_id = ?').get(id) as { c: number };
      const docCount = db.prepare('SELECT COUNT(*) as c FROM documents WHERE department_id = ?').get(id) as { c: number };

      if (userCount.c > 0 || docCount.c > 0) {
        // Safe deactivate
        db.prepare('UPDATE departments SET is_active = 0 WHERE department_id = ?').run(id);
        recordAuditLog(req.user?.userId || null, 'DEPARTMENT_DEACTIVATED', 'DEPARTMENT', id, req.ip, req.headers['user-agent'] as string, {
          reason: 'Department has associated users/docs; deactivated safely'
        });
        sendSuccess(res, { message: 'Department has active users or documents. It has been deactivated safely.' });
        return;
      }

      db.prepare('DELETE FROM departments WHERE department_id = ?').run(id);
      recordAuditLog(req.user?.userId || null, 'DEPARTMENT_DELETED', 'DEPARTMENT', id, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, { message: 'Department deleted successfully' });
    } catch (err: any) {
      sendError(res, 'DEPT_DELETE_ERROR', err.message, 500);
    }
  }
}
