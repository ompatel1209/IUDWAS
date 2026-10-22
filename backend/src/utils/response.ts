import { Response } from 'express';
import { ApiResponse } from '../types';
import { logger } from './logger';

export function sendSuccess<T = any>(
  res: Response,
  data: T,
  meta?: Record<string, any>,
  statusCode = 200
): void {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(payload);
}

/**
 * Sanitizes error messages to ensure users never see:
 * - Stack traces or runtime JS engine traces
 * - Internal absolute file system paths or source code locations
 * - Raw database/SQLite errors or query fragments
 * - Uncaught server exceptions
 */
export function sanitizeClientErrorMessage(rawMessage: string, statusCode = 400): string {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return statusCode >= 500
      ? 'An unexpected internal server error occurred. Please try again later.'
      : 'Invalid request payload or parameters.';
  }

  const msg = rawMessage.trim();

  // 1. Stack traces & Raw Runtime Exceptions (Top Priority)
  if (
    /\n\s*at /.test(msg) ||
    /TypeError:/i.test(msg) ||
    /ReferenceError:/i.test(msg) ||
    /RangeError:/i.test(msg) ||
    /EvalError:/i.test(msg) ||
    /Cannot read propert/i.test(msg) ||
    /is not a function/i.test(msg)
  ) {
    return 'An unexpected server error occurred. Please try again later.';
  }

  // 2. Database & SQLite Internals
  if (/unique constraint failed/i.test(msg)) {
    return 'A record with this information already exists.';
  }
  if (/foreign key constraint failed/i.test(msg)) {
    return 'The referenced record or associated entity was not found.';
  }
  if (/not null constraint failed/i.test(msg)) {
    return 'A required database field value is missing.';
  }
  if (/check constraint failed/i.test(msg)) {
    return 'The provided value does not satisfy system constraints.';
  }
  if (
    /sqlite/i.test(msg) ||
    /SQLITE_/i.test(msg) ||
    /no such table/i.test(msg) ||
    /no such column/i.test(msg) ||
    /has no column/i.test(msg) ||
    /syntax error/i.test(msg)
  ) {
    return 'A database error occurred while processing your request.';
  }

  // 3. File System & OS Errors
  if (/ENOENT/i.test(msg) || /open '/i.test(msg)) {
    return 'The requested file or document could not be found on the server.';
  }
  if (/EACCES/i.test(msg) || /EPERM/i.test(msg)) {
    return 'Access to the requested file resource is restricted.';
  }
  if (/EISDIR/i.test(msg) || /ENOTDIR/i.test(msg) || /EBUSY/i.test(msg) || /EMFILE/i.test(msg)) {
    return 'A file system error occurred while processing the document.';
  }

  // 4. Absolute Server File Paths & Source Files Leak Prevention
  // Matches disk paths like /Users/..., /home/..., /var/..., /tmp/..., /etc/..., /app/..., C:\..., or .ts/.js file paths
  if (
    /(?:\/(?:Users|home|var|tmp|etc|app|srv|opt|root|usr|node_modules)\/[^\s'"]+)/i.test(msg) ||
    /[a-zA-Z]:\\[^\s'"]+/i.test(msg) ||
    /(?:src\/controllers|src\/routes|src\/middleware)\/[a-zA-Z0-9_.-]+\.ts/i.test(msg)
  ) {
    return statusCode >= 500
      ? 'An internal storage error occurred while processing the request.'
      : 'Invalid resource location requested.';
  }

  // 5. Generic 500 Fallback for raw exception messages
  if (statusCode >= 500) {
    if (msg.length > 250) {
      return 'An unexpected error occurred while processing your request. Please try again later.';
    }
  }

  return msg;
}

/**
 * Sanitizes details objects to prevent leaking stack traces or query dumps.
 */
function sanitizeDetails(details: any): any {
  if (!details) return undefined;

  if (details instanceof Error) {
    return undefined; // Never expose raw Error instances
  }

  if (typeof details === 'object') {
    // If it's structured validation issues from Zod, it is safe to return
    if (Array.isArray(details.issues)) {
      return details;
    }
    if (Array.isArray(details)) {
      return details.map(sanitizeDetails);
    }

    const safeObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(details)) {
      if (['stack', 'path', 'sql', 'query', 'bindings', 'password', 'password_hash', 'secret'].includes(key.toLowerCase())) {
        continue;
      }
      safeObj[key] = typeof value === 'string' ? sanitizeClientErrorMessage(value, 400) : value;
    }
    return safeObj;
  }

  return details;
}

export function sendError(
  res: Response,
  code: string,
  message: string,
  statusCode = 400,
  details?: any
): void {
  // Always log 500+ errors server-side for debugging
  if (statusCode >= 500) {
    logger.error(`[${code}] Server Error (${statusCode}):`, message, details);
  }

  const safeMessage = sanitizeClientErrorMessage(message, statusCode);
  const safeDetails = sanitizeDetails(details);

  const payload: ApiResponse = {
    success: false,
    error: {
      code,
      message: safeMessage,
      statusCode,
      ...(safeDetails ? { details: safeDetails } : {}),
    },
    timestamp: new Date().toISOString(),
  };
  res.status(statusCode).json(payload);
}

/**
 * Standardized controller error handling:
 * 1. Logs full raw error and stack trace server-side.
 * 2. Returns a clean, user-safe generic error response to the client.
 */
export function handleControllerError(
  res: Response,
  err: any,
  code: string,
  fallbackMessage?: string,
  statusCode = 500
): void {
  logger.error(`[${code}] Controller Exception (${statusCode}):`, err?.stack || err?.message || err);
  const rawMsg = err?.message || '';
  const safeMsg = fallbackMessage
    ? fallbackMessage
    : (rawMsg ? sanitizeClientErrorMessage(rawMsg, statusCode) : 'An unexpected error occurred. Please try again later.');

  sendError(res, code, safeMsg, statusCode);
}
