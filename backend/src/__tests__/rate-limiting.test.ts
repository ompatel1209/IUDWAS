import { rateLimitStore, authAccountLimiter, uploadLimiter, aiLimiter } from '../middleware/rate-limit.middleware';
import * as RL from '../config/rate-limits.config';
import { Request, Response } from 'express';

describe('Rate Limiting & Exponential Backoff Tests', () => {
  beforeEach(() => {
    // Reset test account in store
    rateLimitStore.recordSuccess('test.rate@iudwas.edu');
    rateLimitStore.recordSuccess('user.backoff@iudwas.edu');
  });

  describe('Configuration Validation', () => {
    it('should have sensible non-zero defaults for all rate limit tiers', () => {
      expect(RL.AUTH.IP_WINDOW_MS).toBeGreaterThan(0);
      expect(RL.AUTH.IP_MAX).toBeGreaterThan(0);
      expect(RL.AUTH.ACCOUNT_FREE_ATTEMPTS).toBeGreaterThanOrEqual(1);
      expect(RL.AUTH.BACKOFF_BASE_SECONDS).toBeGreaterThan(0);
      expect(RL.AUTH.BACKOFF_MAX_SECONDS).toBeGreaterThan(RL.AUTH.BACKOFF_BASE_SECONDS);

      expect(RL.PUBLIC_READ.WINDOW_MS).toBeGreaterThan(0);
      expect(RL.PUBLIC_READ.MAX).toBeGreaterThan(0);

      expect(RL.AUTHENTICATED.IP_MAX).toBeGreaterThan(RL.AUTH.IP_MAX);
      expect(RL.AUTHENTICATED.USER_MAX).toBeGreaterThan(0);

      expect(RL.UPLOAD.MAX).toBeGreaterThan(0);
      expect(RL.AI.MAX).toBeGreaterThan(0);
    });
  });

  describe('Per-Account Exponential Backoff Store', () => {
    const testEmail = 'user.backoff@iudwas.edu';

    it('should allow free attempts without imposing any backoff delay', () => {
      for (let i = 0; i < RL.AUTH.ACCOUNT_FREE_ATTEMPTS; i++) {
        rateLimitStore.recordFailure(testEmail);
        expect(rateLimitStore.remainingBackoffSeconds(testEmail)).toBe(0);
      }
    });

    it('should apply exponential backoff on consecutive failures exceeding free attempts', () => {
      // Free attempts
      for (let i = 0; i < RL.AUTH.ACCOUNT_FREE_ATTEMPTS; i++) {
        rateLimitStore.recordFailure(testEmail);
      }

      // First failure beyond free threshold -> Base backoff (e.g. 2s)
      rateLimitStore.recordFailure(testEmail);
      const backoff1 = rateLimitStore.remainingBackoffSeconds(testEmail);
      expect(backoff1).toBeGreaterThan(0);
      expect(backoff1).toBeLessThanOrEqual(RL.AUTH.BACKOFF_BASE_SECONDS);

      // Second failure beyond free threshold -> 2 * Base backoff (e.g. 4s)
      rateLimitStore.recordFailure(testEmail);
      const backoff2 = rateLimitStore.remainingBackoffSeconds(testEmail);
      expect(backoff2).toBeGreaterThanOrEqual(backoff1);
    });

    it('should immediately clear backoff on recordSuccess', () => {
      for (let i = 0; i < RL.AUTH.ACCOUNT_FREE_ATTEMPTS + 3; i++) {
        rateLimitStore.recordFailure(testEmail);
      }
      expect(rateLimitStore.remainingBackoffSeconds(testEmail)).toBeGreaterThan(0);

      rateLimitStore.recordSuccess(testEmail);
      expect(rateLimitStore.remainingBackoffSeconds(testEmail)).toBe(0);
    });

    it('should handle case insensitivity on account emails', () => {
      const emailLower = 'student.test@iudwas.edu';
      const emailUpper = 'STUDENT.TEST@IUDWAS.EDU';

      for (let i = 0; i < RL.AUTH.ACCOUNT_FREE_ATTEMPTS + 1; i++) {
        rateLimitStore.recordFailure(emailUpper);
      }

      expect(rateLimitStore.remainingBackoffSeconds(emailLower)).toBeGreaterThan(0);
      rateLimitStore.recordSuccess(emailLower);
      expect(rateLimitStore.remainingBackoffSeconds(emailUpper)).toBe(0);
    });
  });

  describe('authAccountLimiter Middleware Integration', () => {
    it('should block requests when account is in exponential backoff delay', () => {
      const email = 'locked.account@iudwas.edu';
      // Induce backoff
      for (let i = 0; i < RL.AUTH.ACCOUNT_FREE_ATTEMPTS + 2; i++) {
        rateLimitStore.recordFailure(email);
      }

      const req = {
        body: { email, password: 'Wrong' },
        ip: '127.0.0.1',
      } as unknown as Request;

      let responseStatusCode = 200;
      let responseBody: any = null;
      const headers: Record<string, string> = {};

      const res = {
        setHeader: (key: string, value: string) => {
          headers[key] = value;
          return res;
        },
        status: (code: number) => {
          responseStatusCode = code;
          return {
            json: (payload: any) => {
              responseBody = payload;
            },
          };
        },
      } as unknown as Response;

      let nextCalled = false;
      const next = () => { nextCalled = true; };

      // Force skipInTests off for this direct middleware invocation
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      authAccountLimiter(req, res, next);

      process.env.NODE_ENV = originalEnv;

      expect(nextCalled).toBe(false);
      expect(responseStatusCode).toBe(429);
      expect(responseBody.error.code).toBe('AUTH_ACCOUNT_BACKOFF');
      expect(headers['Retry-After']).toBeDefined();
      expect(headers['X-RateLimit-Reset']).toBeDefined();

      rateLimitStore.recordSuccess(email);
    });
  });

  describe('Upload & AI Rate Limiters', () => {
    it('should allow upload operations within max limit and block upon exceeding', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockReq = {
        user: { userId: 'test-user-upload-id' },
      } as unknown as Request;

      let resCode = 200;
      let resBody: any = null;
      const headers: Record<string, string> = {};

      const mockRes = {
        setHeader: (k: string, v: string) => { headers[k] = v; return mockRes; },
        status: (c: number) => {
          resCode = c;
          return { json: (p: any) => { resBody = p; } };
        },
      } as unknown as Response;

      let passCount = 0;
      for (let i = 0; i < RL.UPLOAD.MAX; i++) {
        uploadLimiter(mockReq, mockRes, () => { passCount++; });
      }
      expect(passCount).toBe(RL.UPLOAD.MAX);

      // Next request should trigger 429
      let blockedPassed = false;
      uploadLimiter(mockReq, mockRes, () => { blockedPassed = true; });
      expect(blockedPassed).toBe(false);
      expect(resCode).toBe(429);
      expect(resBody.error.code).toBe('UPLOAD_RATE_LIMIT');

      process.env.NODE_ENV = originalEnv;
    });

    it('should enforce AI limiter per user and respond with 429 and Retry-After', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const mockReq = {
        user: { userId: 'test-user-ai-id' },
      } as unknown as Request;

      let resCode = 200;
      let resPayload: any = null;
      const headers: Record<string, string> = {};

      const mockRes = {
        setHeader: (k: string, v: string) => { headers[k] = v; return mockRes; },
        status: (c: number) => {
          resCode = c;
          return { json: (p: any) => { resPayload = p; } };
        },
      } as unknown as Response;

      let passCount = 0;
      for (let i = 0; i < RL.AI.MAX; i++) {
        aiLimiter(mockReq, mockRes, () => { passCount++; });
      }
      expect(passCount).toBe(RL.AI.MAX);

      // Exceeding AI quota
      let blockedPassed = false;
      aiLimiter(mockReq, mockRes, () => { blockedPassed = true; });
      expect(blockedPassed).toBe(false);
      expect(resCode).toBe(429);
      expect(resPayload.error.code).toBe('AI_RATE_LIMIT');
      expect(headers['Retry-After']).toBeDefined();

      process.env.NODE_ENV = originalEnv;
    });
  });
});
