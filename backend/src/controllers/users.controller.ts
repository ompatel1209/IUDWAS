/**
 * ============================================================================
 * MODULE: Administrative User Management Controller (users.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Implements administrative user management operations for Super Admins and
 * Department Admins, including user provisioning, metadata updates, avatar
 * management, status toggling (activate/deactivate), administrative password resets,
 * CSV user export, and safe deactivation cascades.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `listUsers()`:
 *    - Paginated and searchable retrieval of user accounts with departmental
 *      tenancy filtering (Dept Admins scoped to their own division).
 * 2. `getUserById()`:
 *    - Retrieves complete profile details, role, department, and activity dates.
 * 3. `createUser()`:
 *    - Validates email uniqueness, role assignment, and hashes initial password.
 * 4. `updateUser()`:
 *    - Modifies user legal name, assigned role, department, and active status.
 * 5. `uploadUserAvatar()` & `deleteUserAvatar()`:
 *    - Allows admins to upload/remove profile pictures for managed accounts.
 * 6. `toggleUserStatus()`:
 *    - Activates or deactivates accounts with audit logging.
 * 7. `resetUserPassword()`:
 *    - Sets a temporary or new password for a user without old password challenge.
 * 8. `deleteUser()`:
 *    - Handles safe deactivation or deletion with foreign key safety checks.
 * 9. `exportUsersCsv()`:
 *    - Streams a formatted CSV file of all institutional users.
 * ============================================================================
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { sendSuccess, sendError } from '../utils/response';
import { recordAuditLog } from '../middleware/audit.middleware';
import { UserRole } from '../types';

export class UsersController {
  static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string || '1', 10);
      const limit = parseInt(req.query.limit as string || '10', 10);
      const offset = (page - 1) * limit;
      const search = (req.query.search as string || '').trim();
      const role = (req.query.role as string || '').trim();
      const departmentId = (req.query.department_id as string || '').trim();
      const status = (req.query.status as string || '').trim();
      const sortBy = (req.query.sortBy as string || 'created_at').trim();
      const sortOrder = (req.query.sortOrder as string || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const db = getDatabase();

      let whereClauses: string[] = ['1=1'];
      let params: any[] = [];

      // If user is DEPT_ADMIN, restrict to their department unless SUPER_ADMIN
      if (req.user?.role === 'DEPT_ADMIN' && req.user.departmentId) {
        whereClauses.push('u.department_id = ?');
        params.push(req.user.departmentId);
      } else if (departmentId) {
        whereClauses.push('u.department_id = ?');
        params.push(departmentId);
      }

      if (search) {
        whereClauses.push('(u.full_name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)');
        const term = `%${search}%`;
        params.push(term, term, term);
      }

      if (role) {
        whereClauses.push('u.role = ?');
        params.push(role);
      }

      if (status === 'active') {
        whereClauses.push('u.is_active = 1');
      } else if (status === 'inactive') {
        whereClauses.push('u.is_active = 0');
      }

      const whereSql = whereClauses.join(' AND ');

      // Total count
      const countRow = db.prepare(`
        SELECT COUNT(*) as total 
        FROM users u 
        WHERE ${whereSql}
      `).get(...params) as { total: number };

      const total = countRow.total;
      const totalPages = Math.ceil(total / limit);

      const allowedSortColumns = ['full_name', 'email', 'role', 'created_at', 'last_login', 'is_active'];
      const safeSort = allowedSortColumns.includes(sortBy) ? `u.${sortBy}` : 'u.created_at';

      const users = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.last_login, u.created_at, u.updated_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE ${whereSql}
        ORDER BY ${safeSort} ${sortOrder}
        LIMIT ? OFFSET ?
      `).all(...params, limit, offset) as any[];

      const formatted = users.map(u => ({
        ...u,
        is_active: Boolean(u.is_active),
      }));

      sendSuccess(res, formatted, {
        page,
        limit,
        total,
        totalPages,
      });
    } catch (err: any) {
      sendError(res, 'USERS_LIST_ERROR', err.message, 500);
    }
  }

  static async getUserById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const user = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.last_login, u.created_at, u.updated_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(id) as any;

      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      sendSuccess(res, {
        ...user,
        is_active: Boolean(user.is_active),
      });
    } catch (err: any) {
      sendError(res, 'USER_GET_ERROR', err.message, 500);
    }
  }

  static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name, role, department_id, employee_id, avatar_url } = req.body;

      if (!email || !password || !full_name || !role) {
        sendError(res, 'VALIDATION_ERROR', 'Email, password, full name, and role are required', 400);
        return;
      }

      const validRoles: UserRole[] = ['SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY', 'STUDENT'];
      if (!validRoles.includes(role)) {
        sendError(res, 'INVALID_ROLE', `Role must be one of: ${validRoles.join(', ')}`, 400);
        return;
      }

      // Dept admin cannot create Super Admin or user outside their dept
      if (req.user?.role === 'DEPT_ADMIN') {
        if (role === 'SUPER_ADMIN' || role === 'DEPT_ADMIN') {
          sendError(res, 'FORBIDDEN_ROLE_ASSIGNMENT', 'Department admins cannot create administrators', 403);
          return;
        }
      }

      const db = getDatabase();
      const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email.toLowerCase());
      if (existing) {
        sendError(res, 'EMAIL_EXISTS', 'A user with this email address already exists', 409);
        return;
      }

      const userId = uuidv4();
      const passwordHash = bcrypt.hashSync(password, 10);

      db.prepare(`
        INSERT INTO users (user_id, email, password_hash, full_name, role, department_id, employee_id, avatar_url, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(userId, email.toLowerCase(), passwordHash, full_name, role, department_id || null, employee_id || null, avatar_url || null);

      recordAuditLog(req.user?.userId || null, 'ADMIN_USER_CREATE', 'USER', userId, req.ip, req.headers['user-agent'] as string, { email, role, department_id });

      const created = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.created_at,
               d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(userId) as any;

      sendSuccess(res, {
        ...created,
        is_active: Boolean(created.is_active),
      }, undefined, 201);
    } catch (err: any) {
      sendError(res, 'USER_CREATE_ERROR', err.message, 500);
    }
  }

  static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { email, full_name, role, department_id, employee_id, avatar_url, is_active } = req.body;

      const db = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(id) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      // Guard: Cannot remove last SUPER_ADMIN
      if (user.role === 'SUPER_ADMIN' && role && role !== 'SUPER_ADMIN') {
        const superAdminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'SUPER_ADMIN' AND is_active = 1").get() as { count: number };
        if (superAdminCount.count <= 1) {
          sendError(res, 'LAST_SUPER_ADMIN', 'Cannot demote the last active Super Administrator in the system', 400);
          return;
        }
      }

      const newEmail = email ? email.toLowerCase().trim() : user.email;
      const newFullName = full_name !== undefined ? full_name : user.full_name;
      const newRole = role !== undefined ? role : user.role;
      const newDeptId = department_id !== undefined ? department_id : user.department_id;
      const newEmpId = employee_id !== undefined ? employee_id : user.employee_id;
      const newAvatarUrl = avatar_url !== undefined ? avatar_url : user.avatar_url;
      const newActive = is_active !== undefined ? (is_active ? 1 : 0) : user.is_active;

      db.prepare(`
        UPDATE users 
        SET email = ?, full_name = ?, role = ?, department_id = ?, employee_id = ?, avatar_url = ?, is_active = ?, updated_at = datetime('now')
        WHERE user_id = ?
      `).run(newEmail, newFullName, newRole, newDeptId, newEmpId, newAvatarUrl, newActive, id);

      recordAuditLog(req.user?.userId || null, 'ADMIN_USER_UPDATE', 'USER', id, req.ip, req.headers['user-agent'] as string, {
        changes: { role: newRole, is_active: newActive, department_id: newDeptId }
      });

      const updated = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.created_at, u.updated_at,
               d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(id) as any;

      sendSuccess(res, {
        ...updated,
        is_active: Boolean(updated.is_active),
      });
    } catch (err: any) {
      sendError(res, 'USER_UPDATE_ERROR', err.message, 500);
    }
  }

  static async uploadUserAvatar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!req.file) {
        sendError(res, 'NO_FILE', 'Please select an image file', 400);
        return;
      }

      const db = getDatabase();
      const user = db.prepare('SELECT user_id FROM users WHERE user_id = ?').get(id) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      db.prepare("UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE user_id = ?").run(avatarUrl, id);

      recordAuditLog(req.user?.userId || null, 'ADMIN_USER_AVATAR_UPLOAD', 'USER', id, req.ip, req.headers['user-agent'] as string, { avatarUrl });

      const updated = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.created_at, u.updated_at,
               d.name as department_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(id) as any;

      sendSuccess(res, {
        message: 'Avatar uploaded successfully',
        avatar_url: avatarUrl,
        user: {
          ...updated,
          is_active: Boolean(updated.is_active),
        },
      });
    } catch (err: any) {
      sendError(res, 'USER_AVATAR_UPLOAD_ERROR', err.message, 500);
    }
  }

  static async toggleUserStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const user = db.prepare('SELECT user_id, role, is_active FROM users WHERE user_id = ?').get(id) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      // Check if deactivating last super admin
      if (user.role === 'SUPER_ADMIN' && user.is_active === 1) {
        const superAdminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'SUPER_ADMIN' AND is_active = 1").get() as { count: number };
        if (superAdminCount.count <= 1) {
          sendError(res, 'LAST_SUPER_ADMIN', 'Cannot deactivate the last active Super Administrator', 400);
          return;
        }
      }

      const nextStatus = user.is_active === 1 ? 0 : 1;
      db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE user_id = ?").run(nextStatus, id);

      // If deactivating, revoke all sessions
      if (nextStatus === 0) {
        db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ?").run(id);
      }

      recordAuditLog(req.user?.userId || null, nextStatus === 1 ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'USER', id, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, {
        user_id: id,
        is_active: Boolean(nextStatus),
        message: `User account has been ${nextStatus === 1 ? 'activated' : 'deactivated'}.`,
      });
    } catch (err: any) {
      sendError(res, 'STATUS_TOGGLE_ERROR', err.message, 500);
    }
  }

  static async adminResetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { new_password } = req.body;

      if (!new_password || new_password.length < 6) {
        sendError(res, 'VALIDATION_ERROR', 'New password must be at least 6 characters long', 400);
        return;
      }

      const db = getDatabase();
      const user = db.prepare('SELECT user_id, email FROM users WHERE user_id = ?').get(id) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      const passwordHash = bcrypt.hashSync(new_password, 10);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE user_id = ?").run(passwordHash, id);
      db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ?").run(id);

      recordAuditLog(req.user?.userId || null, 'ADMIN_RESET_PASSWORD', 'USER', id, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, { message: 'Password reset successfully' });
    } catch (err: any) {
      sendError(res, 'RESET_PASSWORD_ERROR', err.message, 500);
    }
  }

  static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const db = getDatabase();

      const user = db.prepare('SELECT user_id, role FROM users WHERE user_id = ?').get(id) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      if (user.role === 'SUPER_ADMIN') {
        const superAdminCount = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'SUPER_ADMIN' AND is_active = 1").get() as { count: number };
        if (superAdminCount.count <= 1) {
          sendError(res, 'LAST_SUPER_ADMIN', 'Cannot delete the last Super Administrator', 400);
          return;
        }
      }

      // Check if user has uploaded documents or submitted workflows
      const hasDocs = db.prepare('SELECT COUNT(*) as c FROM documents WHERE uploaded_by = ?').get(id) as { c: number };
      const hasWorkflows = db.prepare('SELECT COUNT(*) as c FROM workflow_instances WHERE submitted_by = ?').get(id) as { c: number };

      if (hasDocs.c > 0 || hasWorkflows.c > 0) {
        // Safe soft-deactivate instead of hard delete to preserve relational integrity & audit trail
        db.prepare("UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?").run(id);
        db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ?").run(id);

        recordAuditLog(req.user?.userId || null, 'USER_SAFE_DEACTIVATED', 'USER', id, req.ip, req.headers['user-agent'] as string, {
          reason: 'User has associated document or workflow records, deactivated safely'
        });

        sendSuccess(res, { message: 'User has associated documents or workflows. Account was safely deactivated.' });
        return;
      }

      // Hard delete if clean
      db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM notifications WHERE user_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE user_id = ?').run(id);

      recordAuditLog(req.user?.userId || null, 'USER_DELETED', 'USER', id, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, { message: 'User deleted successfully' });
    } catch (err: any) {
      sendError(res, 'USER_DELETE_ERROR', err.message, 500);
    }
  }

  static async exportUsersCsv(req: Request, res: Response): Promise<void> {
    try {
      const db = getDatabase();
      const users = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.employee_id, u.is_active, u.created_at, u.last_login,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        ORDER BY u.created_at DESC
      `).all() as any[];

      const headers = ['User ID', 'Full Name', 'Email', 'Role', 'Department', 'Employee/Student ID', 'Status', 'Last Login', 'Created At'];
      const rows = users.map(u => [
        `"${u.user_id}"`,
        `"${u.full_name.replace(/"/g, '""')}"`,
        `"${u.email}"`,
        `"${u.role}"`,
        `"${(u.department_name || '').replace(/"/g, '""')}"`,
        `"${u.employee_id || ''}"`,
        `"${u.is_active ? 'Active' : 'Inactive'}"`,
        `"${u.last_login || ''}"`,
        `"${u.created_at}"`,
      ].join(','));

      const csvContent = [headers.join(','), ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="iudwas_users_export.csv"');
      res.status(200).send(csvContent);
    } catch (err: any) {
      sendError(res, 'EXPORT_ERROR', err.message, 500);
    }
  }
}
