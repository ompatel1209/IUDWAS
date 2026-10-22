/**
 * ============================================================================
 * MODULE: JWT Authentication Guard Middleware (auth.middleware.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Intercepts incoming HTTP requests to verify the presence, signature,
 * expiration, and legitimacy of the JWT Bearer Access Token in the
 * `Authorization` header.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Extends the Express `Request` interface with a strongly-typed `req.user`
 *    containing `userId`, `email`, `role`, and `departmentId`.
 * 2. Checks for `Authorization: Bearer <token>`; returns 401 if missing.
 * 3. Verifies token cryptographically using the configured HMAC secret.
 * 4. Queries the SQLite database to confirm the user account exists and
 *    is actively enabled (`is_active = 1`). Returns 403 if deactivated.
 * 5. Handles `TokenExpiredError` gracefully, signaling the client to refresh.
 * 6. Attaches the decoded payload to `req.user` and passes control to `next()`.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';
import { sendError } from '../utils/response';
import { getDatabase } from '../db/database';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

/**
 * Express middleware to validate JWT access tokens and attach authenticated user context.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      sendError(res, 'AUTH_HEADER_MISSING', 'Authorization header with Bearer token is required', 401);
      return;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      sendError(res, 'TOKEN_MISSING', 'Bearer token is missing', 401);
      return;
    }

    const decoded = verifyAccessToken(token);

    // Verify user is still active in database
    const db = getDatabase();
    const user = db.prepare('SELECT user_id, is_active FROM users WHERE user_id = ?').get(decoded.userId) as { user_id: string; is_active: number } | undefined;

    if (!user) {
      sendError(res, 'USER_NOT_FOUND', 'User account does not exist', 401);
      return;
    }

    if (user.is_active === 0) {
      sendError(res, 'ACCOUNT_DEACTIVATED', 'Your account has been deactivated. Please contact your university administrator.', 403);
      return;
    }

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      sendError(res, 'TOKEN_EXPIRED', 'Authentication token has expired. Please refresh your session.', 401);
      return;
    }
    sendError(res, 'INVALID_TOKEN', 'Authentication token is invalid', 401);
  }
}
