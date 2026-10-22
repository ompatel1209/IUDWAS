/**
 * ============================================================================
 * MODULE: Zod Schema Input Validation Middleware (validate.middleware.ts)
 * ============================================================================
 * 
 * ROLE & PURPOSE:
 * Provides declarative, type-safe request parsing and validation for Express
 * route handlers using Zod schemas for `req.body`, `req.query`, and `req.params`.
 * 
 * WHAT THIS MODULE DOES:
 * 1. Accepts a `RequestValidationSchema` definition containing Zod schemas for
 *    `body`, `query`, and/or `params`.
 * 2. Parses and validates inputs asynchronously.
 * 3. Strips unexpected/unknown properties if using `.strict()` schemas.
 * 4. Casts parsed values to their schema types (e.g. string to number).
 * 5. On validation failure, extracts detailed field-level issues and responds
 *    with a clean 400 Bad Request error payload without exposing server internals.
 * 6. Passes cleanly parsed and typed data to subsequent middleware or controllers.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { sendError } from '../utils/response';

export interface RequestValidationSchema {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Strict schema validation middleware factory using Zod.
 * Validates request body, query parameters, and URL path params against
 * exact types, lengths, and formats, rejecting anything that doesn't match.
 */
export function validate(schema: RequestValidationSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.params) {
        req.params = (await schema.params.parseAsync(req.params)) as any;
      }
      if (schema.query) {
        req.query = (await schema.query.parseAsync(req.query)) as any;
      }
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map((err) => ({
          field: err.path.join('.') || 'request',
          message: err.message,
          rule: err.code,
        }));

        const primaryMessage =
          issues.length > 0
            ? `Validation error on '${issues[0].field}': ${issues[0].message}`
            : 'Input validation failed against schema requirements';

        sendError(res, 'VALIDATION_ERROR', primaryMessage, 400, {
          issues,
          total_errors: issues.length,
        });
        return;
      }

      sendError(res, 'VALIDATION_ERROR', 'Input validation failed against schema', 400);
    }
  };
}
