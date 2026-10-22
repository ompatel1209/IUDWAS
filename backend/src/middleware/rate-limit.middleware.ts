/**
 * IUDWAS Advanced Rate-Limit Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Exports five Express middleware factories, each matched to an endpoint tier:
 *
 *   1. authIpLimiter        — Per-IP sliding-window for all auth routes
 *   2. authAccountLimiter   — Per-account (email) exponential backoff for login
 *   3. publicReadLimiter    — Per-IP limit for unauthenticated read endpoints
 *   4. authenticatedLimiter — Per-IP + per-user limits for CRUD endpoints
 *   5. uploadLimiter        — Per-user hourly cap on file uploads
 *   6. aiLimiter            — Per-user hourly cap on AI/OCR inference
 *
 * Exponential Backoff (auth per-account):
 *   • First N failures (ACCOUNT_FREE_ATTEMPTS) are allowed normally.
 *   • After that: required_wait = BASE * 2^(failures - N)  (capped at MAX_SECONDS)
 *   • A successful login resets the counter.
 *   • The counter auto-resets after ACCOUNT_RESET_WINDOW_MS of inactivity.
 *   • Rejected requests include "Retry-After" (seconds) and
 *     "X-RateLimit-Reset" (Unix epoch) in the response.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { sendError } from '../utils/response';
import { logger } from '../utils/logger';
import * as RL from '../config/rate-limits.config';

// ─── Skip helper (bypasses limits in Jest test environment) ───────────────────
const skipInTests = (): boolean => process.env.NODE_ENV === 'test';

// ─── Standard rate-limit error sender (includes Retry-After) ─────────────────
function rateLimitHandler(
  code: string,
  message: string,
  req: Request,
  res: Response,
  retryAfterSeconds?: number,
): void {
  const resetAt = retryAfterSeconds
    ? Math.floor(Date.now() / 1000) + retryAfterSeconds
    : undefined;

  if (retryAfterSeconds !== undefined) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
  }
  if (resetAt !== undefined) {
    res.setHeader('X-RateLimit-Reset', String(resetAt));
  }

  sendError(res, code, message, 429);
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. AUTH IP LIMITER
//    Applied to all auth routes (login, register, refresh, forgot, reset).
//    Sliding window counted by IP address.
// ══════════════════════════════════════════════════════════════════════════════

export const authIpLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RL.AUTH.IP_WINDOW_MS,
  max: RL.AUTH.IP_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retrySeconds = Math.ceil(RL.AUTH.IP_WINDOW_MS / 1000);
    logger.debug(`[RATE] AUTH_IP blocked | IP=${req.ip}`);
    rateLimitHandler(
      'AUTH_IP_RATE_LIMIT',
      `Too many authentication requests from this IP. ` +
        `Allowed ${RL.AUTH.IP_MAX} per ${RL.AUTH.IP_WINDOW_MS / 60000} minutes. ` +
        `Please wait before retrying.`,
      req, res, retrySeconds,
    );
  },
  skip: skipInTests,
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. AUTH ACCOUNT LIMITER — Exponential Backoff (per email/account)
//    Applied ONLY to login and reset-password (routes that accept an email).
//    On success the caller MUST call rateLimitStore.recordSuccess(email).
//    On failure the caller MUST call rateLimitStore.recordFailure(email).
// ══════════════════════════════════════════════════════════════════════════════

interface AccountRecord {
  failures: number;
  /** Timestamp of the last failure (ms since epoch) */
  lastFailureAt: number;
  /** Unix epoch (ms) before which new attempts are denied */
  blockedUntil: number;
}

/** In-memory store (acceptable for single-process SQLite deployments) */
const accountStore = new Map<string, AccountRecord>();

/** Compute required backoff in seconds given the current failure count */
function computeBackoffSeconds(failures: number): number {
  const extra = failures - RL.AUTH.ACCOUNT_FREE_ATTEMPTS;
  if (extra <= 0) return 0;
  const raw = RL.AUTH.BACKOFF_BASE_SECONDS * Math.pow(2, extra - 1);
  return Math.min(raw, RL.AUTH.BACKOFF_MAX_SECONDS);
}

/** Expire stale records to prevent unbounded memory growth */
function pruneAccountStore(): void {
  const cutoff = Date.now() - RL.AUTH.ACCOUNT_RESET_WINDOW_MS;
  for (const [key, rec] of accountStore) {
    if (rec.lastFailureAt < cutoff) accountStore.delete(key);
  }
}
// Prune every 10 minutes
setInterval(pruneAccountStore, 10 * 60 * 1000).unref();

/** Public API used by auth controller to clear backoff on successful login */
export const rateLimitStore = {
  recordSuccess(email: string): void {
    accountStore.delete(email.toLowerCase());
  },

  recordFailure(email: string): void {
    const key = email.toLowerCase();
    const now = Date.now();
    const rec = accountStore.get(key);
    const existing = rec && (now - rec.lastFailureAt) < RL.AUTH.ACCOUNT_RESET_WINDOW_MS
      ? rec
      : { failures: 0, lastFailureAt: now, blockedUntil: 0 };

    existing.failures += 1;
    existing.lastFailureAt = now;

    const backoffSec = computeBackoffSeconds(existing.failures);
    existing.blockedUntil = backoffSec > 0 ? now + backoffSec * 1000 : 0;

    accountStore.set(key, existing);
    if (backoffSec > 0) {
      logger.debug(
        `[RATE] AUTH_ACCOUNT backoff | email=${key} failures=${existing.failures} backoffSec=${backoffSec}`,
      );
    }
  },

  /** Returns remaining backoff in seconds (0 = not blocked) */
  remainingBackoffSeconds(email: string): number {
    const key = email.toLowerCase();
    const rec = accountStore.get(key);
    if (!rec) return 0;
    // Auto-expire stale record
    if (Date.now() - rec.lastFailureAt >= RL.AUTH.ACCOUNT_RESET_WINDOW_MS) {
      accountStore.delete(key);
      return 0;
    }
    const remaining = rec.blockedUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  },

  /** Expose store size for the /system/health endpoint */
  storeSize(): number {
    return accountStore.size;
  },
};

/**
 * Middleware that checks per-account exponential backoff.
 * Reads `req.body.email` to identify the account.
 * Must be placed AFTER express.json() so body is parsed.
 */
export function authAccountLimiter(req: Request, res: Response, next: NextFunction): void {
  if (skipInTests()) return next();

  const email: string | undefined = req.body?.email;
  if (!email || typeof email !== 'string') return next(); // no email → skip (will fail validation later)

  const retryAfter = rateLimitStore.remainingBackoffSeconds(email);
  if (retryAfter > 0) {
    logger.debug(`[RATE] AUTH_ACCOUNT blocked | email=${email.toLowerCase()} retryAfter=${retryAfter}s`);
    rateLimitHandler(
      'AUTH_ACCOUNT_BACKOFF',
      `Too many failed attempts for this account. ` +
        `Please wait ${retryAfter} second${retryAfter !== 1 ? 's' : ''} before trying again. ` +
        `This delay increases with repeated failures.`,
      req, res, retryAfter,
    );
    return;
  }
  next();
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. PUBLIC READ LIMITER
//    For unauthenticated GET endpoints (e.g. /system/health).
//    Moderate limit — enough for monitoring, not enough for scraping.
// ══════════════════════════════════════════════════════════════════════════════

export const publicReadLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RL.PUBLIC_READ.WINDOW_MS,
  max: RL.PUBLIC_READ.MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retrySeconds = Math.ceil(RL.PUBLIC_READ.WINDOW_MS / 1000);
    logger.debug(`[RATE] PUBLIC_READ blocked | IP=${req.ip}`);
    rateLimitHandler(
      'PUBLIC_RATE_LIMIT',
      `Too many requests. Allowed ${RL.PUBLIC_READ.MAX} per ${RL.PUBLIC_READ.WINDOW_MS / 60000} minutes.`,
      req, res, retrySeconds,
    );
  },
  skip: skipInTests,
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. AUTHENTICATED CRUD LIMITER
//    Two layers:
//      a) Per-IP  — guards unauthenticated / pre-decode stage
//      b) Per-userId — guards authenticated sessions (looser than IP limit
//         because one IP might be a university NAT serving many users)
// ══════════════════════════════════════════════════════════════════════════════

/** Per-IP layer for authenticated endpoints */
export const authenticatedIpLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: RL.AUTHENTICATED.IP_WINDOW_MS,
  max: RL.AUTHENTICATED.IP_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retrySeconds = Math.ceil(RL.AUTHENTICATED.IP_WINDOW_MS / 1000);
    logger.debug(`[RATE] AUTH_USER_IP blocked | IP=${req.ip}`);
    rateLimitHandler(
      'API_IP_RATE_LIMIT',
      `Too many API requests from this IP. ` +
        `Allowed ${RL.AUTHENTICATED.IP_MAX} per ${RL.AUTHENTICATED.IP_WINDOW_MS / 60000} minutes.`,
      req, res, retrySeconds,
    );
  },
  skip: skipInTests,
});

/** Per-user-ID in-memory store for authenticated limiter */
const userRequestStore = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const cutoff = Date.now() - RL.AUTHENTICATED.USER_WINDOW_MS;
  for (const [uid, rec] of userRequestStore) {
    if (rec.windowStart < cutoff) userRequestStore.delete(uid);
  }
}, 5 * 60 * 1000).unref();

/** Per-userId layer — applied after authenticate() so req.user is available */
export function authenticatedUserLimiter(req: Request, res: Response, next: NextFunction): void {
  if (skipInTests()) return next();

  const userId: string | undefined = req.user?.userId;
  if (!userId) return next(); // unauthenticated requests already handled by IP limiter

  const now = Date.now();
  const rec = userRequestStore.get(userId);

  if (!rec || now - rec.windowStart >= RL.AUTHENTICATED.USER_WINDOW_MS) {
    userRequestStore.set(userId, { count: 1, windowStart: now });
    return next();
  }

  rec.count += 1;
  if (rec.count > RL.AUTHENTICATED.USER_MAX) {
    const windowEndMs = rec.windowStart + RL.AUTHENTICATED.USER_WINDOW_MS;
    const retryAfter = Math.ceil((windowEndMs - now) / 1000);
    logger.debug(`[RATE] AUTH_USER_USER blocked | userId=${userId} count=${rec.count}`);
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(windowEndMs / 1000)));
    sendError(
      res,
      'API_USER_RATE_LIMIT',
      `You have exceeded the API rate limit of ${RL.AUTHENTICATED.USER_MAX} requests ` +
        `per ${RL.AUTHENTICATED.USER_WINDOW_MS / 60000} minutes. ` +
        `Please retry in ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`,
      429,
    );
    return;
  }

  next();
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. UPLOAD LIMITER — per user, hourly cap on file uploads
// ══════════════════════════════════════════════════════════════════════════════

const uploadStore = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const cutoff = Date.now() - RL.UPLOAD.WINDOW_MS;
  for (const [uid, rec] of uploadStore) {
    if (rec.windowStart < cutoff) uploadStore.delete(uid);
  }
}, 15 * 60 * 1000).unref();

export function uploadLimiter(req: Request, res: Response, next: NextFunction): void {
  if (skipInTests()) return next();

  const userId: string | undefined = req.user?.userId;
  if (!userId) return next();

  const now = Date.now();
  const rec = uploadStore.get(userId);

  if (!rec || now - rec.windowStart >= RL.UPLOAD.WINDOW_MS) {
    uploadStore.set(userId, { count: 1, windowStart: now });
    return next();
  }

  rec.count += 1;
  if (rec.count > RL.UPLOAD.MAX) {
    const windowEndMs = rec.windowStart + RL.UPLOAD.WINDOW_MS;
    const retryAfter = Math.ceil((windowEndMs - now) / 1000);
    logger.debug(`[RATE] UPLOAD blocked | userId=${userId} count=${rec.count}`);
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(windowEndMs / 1000)));
    sendError(
      res,
      'UPLOAD_RATE_LIMIT',
      `Upload limit reached. You may upload at most ${RL.UPLOAD.MAX} files per hour. ` +
        `Please retry in ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`,
      429,
    );
    return;
  }

  next();
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. AI / OCR LIMITER — per user, hourly cap on compute-heavy inference
// ══════════════════════════════════════════════════════════════════════════════

const aiStore = new Map<string, { count: number; windowStart: number }>();

setInterval(() => {
  const cutoff = Date.now() - RL.AI.WINDOW_MS;
  for (const [uid, rec] of aiStore) {
    if (rec.windowStart < cutoff) aiStore.delete(uid);
  }
}, 15 * 60 * 1000).unref();

export function aiLimiter(req: Request, res: Response, next: NextFunction): void {
  if (skipInTests()) return next();

  const userId: string | undefined = req.user?.userId;
  if (!userId) return next();

  const now = Date.now();
  const rec = aiStore.get(userId);

  if (!rec || now - rec.windowStart >= RL.AI.WINDOW_MS) {
    aiStore.set(userId, { count: 1, windowStart: now });
    return next();
  }

  rec.count += 1;
  if (rec.count > RL.AI.MAX) {
    const windowEndMs = rec.windowStart + RL.AI.WINDOW_MS;
    const retryAfter = Math.ceil((windowEndMs - now) / 1000);
    logger.debug(`[RATE] AI blocked | userId=${userId} count=${rec.count}`);
    res.setHeader('Retry-After', String(retryAfter));
    res.setHeader('X-RateLimit-Reset', String(Math.floor(windowEndMs / 1000)));
    sendError(
      res,
      'AI_RATE_LIMIT',
      `AI/OCR request limit reached. You may make at most ${RL.AI.MAX} AI calls per hour. ` +
        `Please retry in ${retryAfter} second${retryAfter !== 1 ? 's' : ''}.`,
      429,
    );
    return;
  }

  next();
}
