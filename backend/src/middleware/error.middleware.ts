/**
 * ============================================================================
 * MODULE: Centralized Error & Exception Handler (error.middleware.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Top-level Express error-handling middleware that intercepts all unhandled
 * exceptions, Multer upload errors, Zod validation failures, and syntax errors.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Logs full diagnostic stack traces to the server console/logger.
 * 2. Formats Multer upload exceptions (`LIMIT_FILE_SIZE`, unsupported extensions)
 *    into clean HTTP 413 / 400 responses.
 * 3. Catches malformed JSON payloads and returns clean 400 Bad Request.
 * 4. Sanitizes error messages for 500 Internal Server Errors to completely
 *    prevent the leakage of database schemas, SQL queries, internal filesystem
 *    paths, or server stack traces to external clients.
 * 5. Returns a uniform JSON error payload format via `sendError()`.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { sendError, sanitizeClientErrorMessage } from '../utils/response';
import { logger } from '../utils/logger';

/**
 * Express error-handling middleware to intercept exceptions and prevent info leakage.
 */
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction): void {
  // Comprehensive server-side error logging with method, URL, and full stack trace
  logger.error(
    `[UNHANDLED_EXCEPTION] ${req.method} ${req.originalUrl} | Error:`,
    err?.stack || err?.message || err
  );

  // Multer File Upload Errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      sendError(res, 'FILE_TOO_LARGE', 'Uploaded file exceeds the maximum allowed limit (50MB)', 413);
      return;
    }
    sendError(res, 'FILE_UPLOAD_ERROR', 'File upload failed. Please check the file format and size.', 400);
    return;
  }

  // Multer fileFilter custom errors
  if (typeof err.message === 'string' && (err.message.includes('file type') || err.message.includes('Executable or script') || err.message.includes('Unsupported file type'))) {
    sendError(res, 'FILE_UPLOAD_ERROR', err.message, 400);
    return;
  }

  // Zod Validation Errors
  if (err.name === 'ZodError') {
    const issues = Array.isArray(err.errors)
      ? err.errors.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : 'request',
          message: e.message,
          rule: e.code,
        }))
      : undefined;

    sendError(res, 'VALIDATION_ERROR', 'Input validation failed against schema requirements.', 400, {
      issues,
      total_errors: issues?.length || 1,
    });
    return;
  }

  // JSON Body Parser Syntax Errors
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400 && 'body' in err) {
    sendError(res, 'MALFORMED_JSON', 'Malformed JSON payload received in request body.', 400);
    return;
  }

  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : typeof err.status === 'number' ? err.status : 500;
  const code = typeof err.code === 'string' && !err.code.startsWith('SQLITE_') ? err.code : 'INTERNAL_SERVER_ERROR';

  const userSafeMessage = statusCode >= 500
    ? 'An unexpected error occurred while processing your request. Please try again later.'
    : sanitizeClientErrorMessage(err.message || 'Invalid request', statusCode);

  sendError(res, code, userSafeMessage, statusCode);
}
