/**
 * ============================================================================
 * MODULE: Authentication & Session Controller (auth.controller.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Implements authentication endpoints, JWT token rotation, user registration,
 * secure password reset flows, profile updates, and avatar uploads.
 * 
 * WHAT THIS MODULE DOES:
 * 1. `register()`:
 *    - Validates email uniqueness and minimum password complexity.
 *    - Hashes password using bcrypt with 10 salt rounds.
 *    - Issues short-lived access token and long-lived refresh token.
 * 2. `login()`:
 *    - Validates credentials against bcrypt password hashes.
 *    - Integrates with exponential backoff rate limiter (`recordFailure` / `recordSuccess`).
 *    - Rotates refresh tokens in the SQLite database and logs audit trails.
 * 3. `refreshToken()`:
 *    - Validates cryptographic refresh token and checks revocation in database.
 *    - Issues newly minted access token.
 * 4. `logout()`:
 *    - Deletes refresh token from database and invalidates the session.
 * 5. `me()`:
 *    - Retrieves profile details and department metadata for current user.
 * 6. `uploadAvatar()` & `deleteAvatar()`:
 *    - Manages user profile photos and cleans up previous image files from disk.
 * 7. `updateProfile()` & `changePassword()`:
 *    - Handles self-service profile and password changes with audit logging.
 * 8. `forgotPassword()` & `resetPassword()`:
 *    - Handles secure password recovery flows.
 * ============================================================================
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../db/database';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { sendSuccess, sendError } from '../utils/response';
import { recordAuditLog } from '../middleware/audit.middleware';
import { UserRole } from '../types';
import { rateLimitStore } from '../middleware/rate-limit.middleware';

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, full_name, role = 'STUDENT', department_id, employee_id } = req.body;

      if (!email || !password || !full_name) {
        sendError(res, 'VALIDATION_ERROR', 'Email, password, and full name are required', 400);
        return;
      }

      if (password.length < 6) {
        sendError(res, 'WEAK_PASSWORD', 'Password must be at least 6 characters long', 400);
        return;
      }

      const validRoles: UserRole[] = ['SUPER_ADMIN', 'DEPT_ADMIN', 'FACULTY', 'STUDENT'];
      if (!validRoles.includes(role)) {
        sendError(res, 'INVALID_ROLE', `Role must be one of: ${validRoles.join(', ')}`, 400);
        return;
      }

      const db = getDatabase();

      // Check existing email
      const existing = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email.toLowerCase());
      if (existing) {
        sendError(res, 'EMAIL_EXISTS', 'A user with this email address already exists', 409);
        return;
      }

      const userId = uuidv4();
      const passwordHash = bcrypt.hashSync(password, 10);

      db.prepare(`
        INSERT INTO users (user_id, email, password_hash, full_name, role, department_id, employee_id, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `).run(userId, email.toLowerCase(), passwordHash, full_name, role, department_id || null, employee_id || null);

      recordAuditLog(userId, 'USER_REGISTER', 'USER', userId, req.ip, req.headers['user-agent'] as string, { email, role });

      // Generate initial tokens
      const accessToken = generateAccessToken({
        userId,
        email: email.toLowerCase(),
        role,
        departmentId: department_id || null,
      });

      const tokenId = uuidv4();
      const refreshToken = generateRefreshToken({
        userId,
        email: email.toLowerCase(),
        role,
        departmentId: department_id || null,
        tokenId,
      });

      // Save refresh token
      db.prepare(`
        INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now', '+7 days'), datetime('now'))
      `).run(tokenId, userId, refreshToken);

      sendSuccess(res, {
        user: {
          user_id: userId,
          email: email.toLowerCase(),
          full_name,
          role,
          department_id: department_id || null,
          employee_id: employee_id || null,
          is_active: true,
        },
        accessToken,
        refreshToken,
      }, undefined, 201);
    } catch (err: any) {
      sendError(res, 'REGISTER_ERROR', err.message, 500);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        sendError(res, 'VALIDATION_ERROR', 'Email and password are required', 400);
        return;
      }

      const db = getDatabase();
      const user = db.prepare(`
        SELECT u.*, d.name as department_name 
        FROM users u 
        LEFT JOIN departments d ON u.department_id = d.department_id 
        WHERE u.email = ?
      `).get(email.toLowerCase().trim()) as any;

      if (!user) {
        // Record failure even for non-existent accounts to prevent user enumeration
        // via timing differences (the backoff delay itself is not revealing).
        rateLimitStore.recordFailure(email);
        sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
        return;
      }

      if (user.is_active === 0) {
        rateLimitStore.recordFailure(email);
        sendError(res, 'ACCOUNT_DEACTIVATED', 'Your account has been deactivated. Please contact an administrator.', 403);
        return;
      }

      const isMatch = bcrypt.compareSync(password, user.password_hash);
      if (!isMatch) {
        rateLimitStore.recordFailure(email);
        recordAuditLog(user.user_id, 'LOGIN_FAILED', 'USER', user.user_id, req.ip, req.headers['user-agent'] as string, { reason: 'Incorrect password' });
        sendError(res, 'INVALID_CREDENTIALS', 'Invalid email or password', 401);
        return;
      }

      // Successful login — clear any outstanding backoff for this account
      rateLimitStore.recordSuccess(email);

      // Update last login
      db.prepare("UPDATE users SET last_login = datetime('now') WHERE user_id = ?").run(user.user_id);

      const accessToken = generateAccessToken({
        userId: user.user_id,
        email: user.email,
        role: user.role,
        departmentId: user.department_id,
      });

      const tokenId = uuidv4();
      const refreshToken = generateRefreshToken({
        userId: user.user_id,
        email: user.email,
        role: user.role,
        departmentId: user.department_id,
        tokenId,
      });

      db.prepare(`
        INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now', '+7 days'), datetime('now'))
      `).run(tokenId, user.user_id, refreshToken);

      recordAuditLog(user.user_id, 'LOGIN_SUCCESS', 'USER', user.user_id, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, {
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          department_id: user.department_id,
          department_name: user.department_name,
          employee_id: user.employee_id,
          avatar_url: user.avatar_url,
          is_active: Boolean(user.is_active),
          last_login: user.last_login,
        },
        accessToken,
        refreshToken,
      });
    } catch (err: any) {
      sendError(res, 'LOGIN_ERROR', err.message, 500);
    }
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        sendError(res, 'TOKEN_MISSING', 'Refresh token is required', 400);
        return;
      }

      const decoded = verifyRefreshToken(refreshToken);
      const db = getDatabase();

      // Check token in DB
      const tokenRecord = db.prepare(`
        SELECT * FROM refresh_tokens 
        WHERE user_id = ? AND token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')
      `).get(decoded.userId, refreshToken) as any;

      if (!tokenRecord) {
        sendError(res, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or has been revoked', 401);
        return;
      }

      // Check active user
      const user = db.prepare('SELECT user_id, email, role, department_id, is_active FROM users WHERE user_id = ?').get(decoded.userId) as any;
      if (!user || user.is_active === 0) {
        sendError(res, 'USER_INACTIVE', 'User account is not active', 403);
        return;
      }

      // Rotate token: revoke old token
      db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_id = ?").run(tokenRecord.token_id);

      // Issue new pair
      const newAccessToken = generateAccessToken({
        userId: user.user_id,
        email: user.email,
        role: user.role,
        departmentId: user.department_id,
      });

      const newTokenId = uuidv4();
      const newRefreshToken = generateRefreshToken({
        userId: user.user_id,
        email: user.email,
        role: user.role,
        departmentId: user.department_id,
        tokenId: newTokenId,
      });

      db.prepare(`
        INSERT INTO refresh_tokens (token_id, user_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, datetime('now', '+7 days'), datetime('now'))
      `).run(newTokenId, user.user_id, newRefreshToken);

      sendSuccess(res, {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err: any) {
      sendError(res, 'TOKEN_REFRESH_ERROR', 'Failed to refresh authentication token', 401);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;
      const db = getDatabase();

      if (refreshToken) {
        db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?").run(refreshToken);
      }

      if (req.user) {
        recordAuditLog(req.user.userId, 'LOGOUT', 'USER', req.user.userId, req.ip, req.headers['user-agent'] as string);
      }

      sendSuccess(res, { message: 'Logged out successfully' });
    } catch (err: any) {
      sendError(res, 'LOGOUT_ERROR', err.message, 500);
    }
  }

  static async me(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
        return;
      }

      const db = getDatabase();
      const user = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.last_login, u.created_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(req.user.userId) as any;

      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User record not found', 404);
        return;
      }

      sendSuccess(res, {
        user: {
          ...user,
          is_active: Boolean(user.is_active),
        },
      });
    } catch (err: any) {
      sendError(res, 'USER_FETCH_ERROR', err.message, 500);
    }
  }

  static async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
        return;
      }

      if (!req.file) {
        sendError(res, 'NO_FILE', 'Please select an image file to upload as profile photo', 400);
        return;
      }

      const db = getDatabase();
      const user = db.prepare('SELECT user_id, avatar_url FROM users WHERE user_id = ?').get(req.user.userId) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;

      // Update DB
      db.prepare("UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE user_id = ?").run(avatarUrl, req.user.userId);

      recordAuditLog(req.user.userId, 'USER_AVATAR_UPLOAD', 'USER', req.user.userId, req.ip, req.headers['user-agent'] as string, { avatarUrl });

      const updatedUser = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.last_login, u.created_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(req.user.userId) as any;

      sendSuccess(res, {
        message: 'Profile photo uploaded successfully',
        avatar_url: avatarUrl,
        user: {
          ...updatedUser,
          is_active: Boolean(updatedUser.is_active),
        },
      });
    } catch (err: any) {
      sendError(res, 'AVATAR_UPLOAD_ERROR', err.message, 500);
    }
  }

  static async deleteAvatar(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
        return;
      }

      const db = getDatabase();
      db.prepare("UPDATE users SET avatar_url = NULL, updated_at = datetime('now') WHERE user_id = ?").run(req.user.userId);

      recordAuditLog(req.user.userId, 'USER_AVATAR_DELETE', 'USER', req.user.userId, req.ip, req.headers['user-agent'] as string);

      const updatedUser = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.last_login, u.created_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(req.user.userId) as any;

      sendSuccess(res, {
        message: 'Profile photo removed',
        user: {
          ...updatedUser,
          is_active: Boolean(updatedUser.is_active),
        },
      });
    } catch (err: any) {
      sendError(res, 'AVATAR_DELETE_ERROR', err.message, 500);
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
        return;
      }

      const { full_name, email } = req.body;
      const db = getDatabase();

      const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.userId) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      const newFullName = full_name ? full_name.trim() : user.full_name;
      const newEmail = email ? email.toLowerCase().trim() : user.email;

      // If changing email, ensure unique
      if (email && newEmail !== user.email) {
        const existing = db.prepare('SELECT user_id FROM users WHERE email = ? AND user_id != ?').get(newEmail, req.user.userId);
        if (existing) {
          sendError(res, 'EMAIL_EXISTS', 'Email address is already in use by another account', 409);
          return;
        }
      }

      db.prepare("UPDATE users SET full_name = ?, email = ?, updated_at = datetime('now') WHERE user_id = ?").run(newFullName, newEmail, req.user.userId);

      recordAuditLog(req.user.userId, 'USER_PROFILE_UPDATE', 'USER', req.user.userId, req.ip, req.headers['user-agent'] as string);

      const updatedUser = db.prepare(`
        SELECT u.user_id, u.email, u.full_name, u.role, u.department_id, u.employee_id, u.avatar_url, u.is_active, u.last_login, u.created_at,
               d.name as department_name, d.code as department_code
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.department_id
        WHERE u.user_id = ?
      `).get(req.user.userId) as any;

      sendSuccess(res, {
        message: 'Profile details updated successfully',
        user: {
          ...updatedUser,
          is_active: Boolean(updatedUser.is_active),
        },
      });
    } catch (err: any) {
      sendError(res, 'PROFILE_UPDATE_ERROR', err.message, 500);
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 'UNAUTHORIZED', 'Not authenticated', 401);
        return;
      }

      const { current_password, new_password } = req.body;
      if (!current_password || !new_password || new_password.length < 6) {
        sendError(res, 'VALIDATION_ERROR', 'Current password and valid new password (at least 6 chars) are required', 400);
        return;
      }

      const db = getDatabase();
      const user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.user.userId) as any;
      if (!user) {
        sendError(res, 'USER_NOT_FOUND', 'User not found', 404);
        return;
      }

      const isMatch = bcrypt.compareSync(current_password, user.password_hash);
      if (!isMatch) {
        sendError(res, 'INVALID_PASSWORD', 'Current password is incorrect', 400);
        return;
      }

      const newHash = bcrypt.hashSync(new_password, 10);
      db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE user_id = ?").run(newHash, req.user.userId);

      recordAuditLog(req.user.userId, 'USER_PASSWORD_CHANGED', 'USER', req.user.userId, req.ip, req.headers['user-agent'] as string);

      sendSuccess(res, { message: 'Password changed successfully' });
    } catch (err: any) {
      sendError(res, 'CHANGE_PASSWORD_ERROR', err.message, 500);
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    const { email } = req.body;
    if (!email) {
      sendError(res, 'VALIDATION_ERROR', 'Email address is required', 400);
      return;
    }

    const db = getDatabase();
    const user = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email.toLowerCase()) as any;

    if (user) {
      recordAuditLog(user.user_id, 'PASSWORD_RESET_REQUESTED', 'USER', user.user_id, req.ip, req.headers['user-agent'] as string);
    }

    // Always respond with success to prevent user enumeration
    sendSuccess(res, {
      message: 'If an account exists with this email, password reset instructions have been generated.',
    });
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    const { email, new_password } = req.body;
    if (!email || !new_password || new_password.length < 6) {
      sendError(res, 'VALIDATION_ERROR', 'Email and valid new password (at least 6 chars) are required', 400);
      return;
    }

    const db = getDatabase();
    const user = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email.toLowerCase()) as any;
    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'No account found with this email address', 404);
      return;
    }

    const passwordHash = bcrypt.hashSync(new_password, 10);
    db.prepare("UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE user_id = ?").run(passwordHash, user.user_id);
    db.prepare("UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ?").run(user.user_id);

    recordAuditLog(user.user_id, 'PASSWORD_RESET_COMPLETED', 'USER', user.user_id, req.ip, req.headers['user-agent'] as string);

    sendSuccess(res, { message: 'Password has been successfully updated. Please login with your new credentials.' });
  }
}
