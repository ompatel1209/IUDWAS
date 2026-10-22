import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { avatarUpload } from '../middleware/upload.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  logoutSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../schemas';
import {
  authIpLimiter,
  authAccountLimiter,
  authenticatedIpLimiter,
  authenticatedUserLimiter,
} from '../middleware/rate-limit.middleware';

const router = Router();

// ── Sensitive credential-mutation routes ──────────────────────────────────────
// Strictest rate-limiting + strict schema validation against types, lengths, and formats
router.post('/login',           authIpLimiter, validate({ body: loginSchema }), authAccountLimiter, AuthController.login);
router.post('/register',        authIpLimiter, validate({ body: registerSchema }), AuthController.register);
router.post('/forgot-password', authIpLimiter, validate({ body: forgotPasswordSchema }), authAccountLimiter, AuthController.forgotPassword);
router.put('/reset-password',   authIpLimiter, validate({ body: resetPasswordSchema }), authAccountLimiter, AuthController.resetPassword);

// ── Token lifecycle ───────────────────────────────────────────────────────────
router.post('/refresh', authIpLimiter, validate({ body: refreshTokenSchema }), AuthController.refresh);

// ── Authenticated profile routes ──────────────────────────────────────────────
router.post('/logout',          authenticate, authenticatedIpLimiter, authenticatedUserLimiter, validate({ body: logoutSchema }), AuthController.logout);
router.get('/me',               authenticate, authenticatedIpLimiter, authenticatedUserLimiter, AuthController.me);
router.put('/profile',          authenticate, authenticatedIpLimiter, authenticatedUserLimiter, AuthController.updateProfile);
router.put('/change-password',  authenticate, authenticatedIpLimiter, authenticatedUserLimiter, AuthController.changePassword);
router.post('/avatar',          authenticate, authenticatedIpLimiter, authenticatedUserLimiter, avatarUpload.single('avatar'), AuthController.uploadAvatar);
router.delete('/avatar',        authenticate, authenticatedIpLimiter, authenticatedUserLimiter, AuthController.deleteAvatar);

export default router;
