/**
 * ============================================================================
 * MODULE: Role-Based Access Control (RBAC) Guard (rbac.middleware.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Enforces institutional authorization policies, hierarchical role restrictions,
 * and departmental tenancy scoping across all protected API routes.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `requireRole(...allowedRoles)`:
 *    - Validates that the authenticated user's role (`SUPER_ADMIN`, `DEPT_ADMIN`,
 *      `FACULTY`, or `STUDENT`) exists within the permitted roles list.
 *    - Returns 403 Forbidden with clear diagnostic feedback if unauthorized.
 * 2. `requireDepartmentScope()`:
 *    - Grants universal cross-department access to `SUPER_ADMIN`.
 *    - Enforces strict departmental data isolation for `DEPT_ADMIN`, restricting
 *      actions only to their assigned `departmentId`.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { sendError } from '../utils/response';

/**
 * Middleware factory that restricts route access to specified user roles.
 * @param {...UserRole[]} allowedRoles - Roles permitted to execute the handler.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        'FORBIDDEN',
        `Access denied. Role '${req.user.role}' does not have sufficient permissions for this operation. Required: [${allowedRoles.join(', ')}]`,
        403
      );
      return;
    }

    next();
  };
}

/**
 * Middleware that guarantees Department Admins only operate on data within their department.
 */
export function requireDepartmentScope() {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, 'UNAUTHORIZED', 'Authentication required', 401);
      return;
    }

    // Super admin has universal scope
    if (req.user.role === 'SUPER_ADMIN') {
      return next();
    }

    // If request contains departmentId query or body param, verify match
    const targetDeptId = req.params.departmentId || req.body.department_id || req.query.department_id;
    if (targetDeptId && req.user.role === 'DEPT_ADMIN' && req.user.departmentId !== targetDeptId) {
      sendError(res, 'DEPARTMENT_SCOPE_FORBIDDEN', 'Department Admins can only manage resources within their assigned department', 403);
      return;
    }

    next();
  };
}
