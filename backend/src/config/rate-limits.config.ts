/**
 * IUDWAS Rate Limit Configuration
 * ─────────────────────────────────────────────────────────────────────────────
 * All thresholds are driven by environment variables so they can be tuned
 * per environment (dev / staging / prod) without a code change.
 *
 * Env variable naming convention:
 *   RATE_<TIER>_<DIMENSION>
 *
 * Example: RATE_AUTH_IP_MAX=10  →  auth tier, per-IP, max 10 requests
 *
 * Window sizes are in milliseconds. Backoff multipliers are in seconds.
 * ─────────────────────────────────────────────────────────────────────────────
 */

function env(key: string, fallback: number): number {
  const val = process.env[key];
  if (val === undefined || val === '') return fallback;
  const parsed = Number(val);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid rate-limit env var ${key}="${val}" — must be a positive number`);
  }
  return parsed;
}

// ─── AUTH TIER (login, register, forgot-password, reset-password) ────────────
export const AUTH = {
  /** Rolling window for IP-based auth limiting (ms) */
  IP_WINDOW_MS:   env('RATE_AUTH_IP_WINDOW_MS', 15 * 60 * 1000),
  /** Max requests per IP within that window */
  IP_MAX:         env('RATE_AUTH_IP_MAX', 20),

  /**
   * Per-account (email) exponential backoff.
   * After this many consecutive failures for the same account, backoff kicks in.
   */
  ACCOUNT_FREE_ATTEMPTS: env('RATE_AUTH_ACCOUNT_FREE_ATTEMPTS', 5),
  /** Base delay in seconds for backoff (delay = base * 2^(failures - free_attempts)) */
  BACKOFF_BASE_SECONDS:  env('RATE_AUTH_BACKOFF_BASE_SECONDS', 2),
  /** Maximum backoff delay in seconds (caps the exponential growth) */
  BACKOFF_MAX_SECONDS:   env('RATE_AUTH_BACKOFF_MAX_SECONDS', 30 * 60),
  /**
   * Inactivity window: if no failed attempt arrives for this many ms,
   * the failure counter resets automatically.
   */
  ACCOUNT_RESET_WINDOW_MS: env('RATE_AUTH_ACCOUNT_RESET_WINDOW_MS', 60 * 60 * 1000),
} as const;

// ─── REFRESH TIER (automatic token renewal, substantically higher cap) ──────
export const REFRESH = {
  WINDOW_MS: env('RATE_REFRESH_WINDOW_MS', 15 * 60 * 1000),
  MAX:       env('RATE_REFRESH_MAX', 120),
};

// ─── PUBLIC READ TIER (health, unauthenticated GET endpoints) ─────────────────
export const PUBLIC_READ = {
  WINDOW_MS: env('RATE_PUBLIC_WINDOW_MS', 15 * 60 * 1000),
  MAX:       env('RATE_PUBLIC_MAX', 120),
} as const;

// ─── AUTHENTICATED TIER (general authenticated CRUD) ─────────────────────────
export const AUTHENTICATED = {
  /** Per IP window / max (covers requests before JWT is decoded) */
  IP_WINDOW_MS: env('RATE_AUTH_USER_IP_WINDOW_MS', 15 * 60 * 1000),
  IP_MAX:       env('RATE_AUTH_USER_IP_MAX', 600),
  /** Per user-ID window / max (applied after successful auth middleware) */
  USER_WINDOW_MS: env('RATE_AUTH_USER_USER_WINDOW_MS', 15 * 60 * 1000),
  USER_MAX:       env('RATE_AUTH_USER_USER_MAX', 500),
} as const;

// ─── UPLOAD TIER (multipart file upload endpoints) ────────────────────────────
export const UPLOAD = {
  WINDOW_MS: env('RATE_UPLOAD_WINDOW_MS', 60 * 60 * 1000), // 1 hour window
  MAX:       env('RATE_UPLOAD_MAX', 30),                   // 30 uploads/hr per user
} as const;

// ─── AI / OCR TIER (compute-heavy inference endpoints) ────────────────────────
export const AI = {
  WINDOW_MS: env('RATE_AI_WINDOW_MS', 60 * 60 * 1000), // 1 hour window
  MAX:       env('RATE_AI_MAX', 60),                    // 60 AI calls/hr per user
} as const;
